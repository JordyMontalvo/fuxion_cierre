#include <algorithm>
#include <arpa/inet.h>
#include <chrono>
#include <cstdlib>
#include <cstring>
#include <iostream>
#include <libpq-fe.h>
#include <map>
#include <netinet/in.h>
#include <sstream>
#include <string>
#include <sys/socket.h>
#include <unistd.h>
#include <vector>

struct User {
  uint32_t id = 0;
  uint32_t sponsorId = 0;
  float pv4 = 0;
  float gv = 0;
  float maxBranch = 0;
  std::string rank = "";
  std::string prevRank = "";
  float bonus = 0;
  std::vector<uint32_t> children;
  int level = 0;
  bool qualified = false;
  int qualifiedDirects = 0;
};

struct SimulationStats {
  int totalUsers = 0;
  std::string executionTime;
  float totalVolume = 0;
  float totalBonus = 0;
  float avgPv4 = 0;
  std::map<std::string, int> ranksSummary;
  int rankUps = 0;
  std::vector<std::string> logs;
};

std::vector<User> allUsers;
SimulationStats stats;

static std::string jsonEscape(const std::string &s) {
  std::string out;
  out.reserve(s.size() + 8);
  for (char c : s) {
    if (c == '"' || c == '\\') {
      out.push_back('\\');
      out.push_back(c);
    } else if (c == '\n') {
      out += "\\n";
    } else {
      out.push_back(c);
    }
  }
  return out;
}

static float randPv() {
  return static_cast<float>(std::rand() % 500);
}

static std::vector<User> generateTree(int count) {
  std::vector<User> users(static_cast<size_t>(count));
  users[0].id = 0;
  users[0].sponsorId = 0;
  users[0].pv4 = randPv();
  users[0].level = 0;

  for (int i = 1; i < count; ++i) {
    uint32_t sponsorId = static_cast<uint32_t>(std::rand() % i);
    float pv4 = 0;
    if ((std::rand() % 1000) / 1000.0f > 0.2f) {
      pv4 = static_cast<float>((std::rand() % 100) + 50);
    }

    users[i].id = static_cast<uint32_t>(i);
    users[i].sponsorId = sponsorId;
    users[i].pv4 = pv4;
    users[i].level = users[sponsorId].level + 1;
    users[sponsorId].children.push_back(static_cast<uint32_t>(i));
  }

  return users;
}

static std::vector<User> loadFromDBOrThrow() {
  const char *envUrl = std::getenv("DATABASE_URL");
  std::string connInfo = envUrl ? envUrl : "postgres://postgres:postgres@localhost:5432/fuxion";

  PGconn *conn = PQconnectdb(connInfo.c_str());
  if (PQstatus(conn) != CONNECTION_OK) {
    std::string err = PQerrorMessage(conn);
    PQfinish(conn);
    throw std::runtime_error("DB connection failed: " + err);
  }

  std::cout << "Fetching users from PostgreSQL..." << std::endl;
  PGresult *res = PQexec(conn, "SELECT id, COALESCE(sponsor_id, 0), pv4, level FROM users ORDER BY id ASC");
  if (PQresultStatus(res) != PGRES_TUPLES_OK) {
    std::string err = PQerrorMessage(conn);
    PQclear(res);
    PQfinish(conn);
    throw std::runtime_error("DB query failed: " + err);
  }

  int rows = PQntuples(res);
  std::vector<User> users;
  users.reserve(static_cast<size_t>(rows));
  for (int i = 0; i < rows; ++i) {
    User u;
    u.id = static_cast<uint32_t>(std::strtoul(PQgetvalue(res, i, 0), nullptr, 10));
    u.sponsorId = static_cast<uint32_t>(std::strtoul(PQgetvalue(res, i, 1), nullptr, 10));
    u.pv4 = std::strtof(PQgetvalue(res, i, 2), nullptr);
    u.level = std::atoi(PQgetvalue(res, i, 3));
    users.push_back(u);
  }

  PQclear(res);
  PQfinish(conn);

  std::cout << "Rebuilding tree in memory..." << std::endl;
  for (size_t i = 0; i < users.size(); ++i) {
    const User &u = users[i];
    if (u.id != 0 && u.sponsorId < users.size() && u.sponsorId != u.id) {
      users[u.sponsorId].children.push_back(u.id);
    }
    if (i % 1000000 == 0) {
      std::cout << "Processed " << i << " nodes..." << std::endl;
    }
  }
  return users;
}

static void calculate(std::vector<User> &users) {
  for (int i = static_cast<int>(users.size()) - 1; i >= 0; --i) {
    User &u = users[static_cast<size_t>(i)];
    u.gv += u.pv4;
    if (u.sponsorId < users.size() && u.sponsorId != u.id) {
      users[u.sponsorId].gv += u.gv;
      if (u.gv > users[u.sponsorId].maxBranch) {
        users[u.sponsorId].maxBranch = u.gv;
      }
    }
  }

  for (User &u : users) {
    u.qualified = u.pv4 >= 40;
    u.prevRank = u.rank;
    u.qualifiedDirects = 0;
    int lines1K = 0;

    for (uint32_t childId : u.children) {
      if (childId < users.size()) {
        User &child = users[childId];
        if (child.gv >= 1000) {
          lines1K++;
        }
      }
    }

    float mvrLimit = u.gv * 0.6f;
    float effV = u.gv;
    if (u.maxBranch > mvrLimit) {
      effV = (u.gv - u.maxBranch) + mvrLimit;
    }

    std::string rank = "Partner / No Calificado";
    if (effV >= 100000 && lines1K >= 4) {
      rank = "Blue Diamond";
    } else if (effV >= 60000 && lines1K >= 4) {
      rank = "Diamond";
    } else if (effV >= 30000 && lines1K >= 3) {
      rank = "Elite Leader";
    } else if (effV >= 15000 && lines1K >= 2) {
      rank = "Premier Leader";
    } else if (effV >= 6000 && lines1K >= 2) {
      rank = "Leader X";
    } else if (effV >= 4000 && lines1K >= 1) {
      rank = "Senior Team Builder";
    } else if (effV >= 2000) {
      rank = "Team Builder";
    } else if (effV >= 1000) {
      rank = "Senior Entrepreneur";
    } else if (effV >= 500) {
      rank = "Executive Ent.";
    } else if (effV >= 200) {
      rank = "Entrepreneur";
    }
    u.rank = rank;
  }

  const float percentages[6] = {0.10f, 0.07f, 0.06f, 0.04f, 0.03f, 0.02f};
  for (User &u : users) {
    if (u.pv4 < 40) {
      continue;
    }
    float val = u.pv4;
    uint32_t currentSponsor = u.sponsorId;
    int levelIdx = 0;

    while (levelIdx < 6 && currentSponsor < users.size() &&
           currentSponsor != users[currentSponsor].sponsorId) {
      User &sponsor = users[currentSponsor];
      if (sponsor.qualified) {
        sponsor.bonus += val * percentages[levelIdx];
        levelIdx++;
      }
      currentSponsor = sponsor.sponsorId;
    }
  }
}

static std::string statsToJson(const SimulationStats &s) {
  std::ostringstream oss;
  oss << "{";
  oss << "\"totalUsers\":" << s.totalUsers << ",";
  oss << "\"executionTime\":\"" << jsonEscape(s.executionTime) << "\",";
  oss << "\"totalVolume\":" << s.totalVolume << ",";
  oss << "\"totalBonus\":" << s.totalBonus << ",";
  oss << "\"avgPv4\":" << s.avgPv4 << ",";
  oss << "\"ranksSummary\":{";
  bool first = true;
  for (const auto &entry : s.ranksSummary) {
    if (!first) {
      oss << ",";
    }
    first = false;
    oss << "\"" << jsonEscape(entry.first) << "\":" << entry.second;
  }
  oss << "},";
  oss << "\"rankUps\":" << s.rankUps << ",";
  oss << "\"logs\":[";
  for (size_t i = 0; i < s.logs.size(); ++i) {
    if (i > 0) {
      oss << ",";
    }
    oss << "\"" << jsonEscape(s.logs[i]) << "\"";
  }
  oss << "]";
  oss << "}";
  return oss.str();
}

static std::string userToJson(const User &u) {
  std::ostringstream oss;
  oss << "{";
  oss << "\"id\":" << u.id << ",";
  oss << "\"sponsorId\":" << u.sponsorId << ",";
  oss << "\"pv4\":" << u.pv4 << ",";
  oss << "\"gv\":" << u.gv << ",";
  oss << "\"maxBranch\":" << u.maxBranch << ",";
  oss << "\"rank\":\"" << jsonEscape(u.rank) << "\",";
  oss << "\"prevRank\":\"" << jsonEscape(u.prevRank) << "\",";
  oss << "\"bonus\":" << u.bonus << ",";
  oss << "\"children\":[";
  for (size_t i = 0; i < u.children.size(); ++i) {
    if (i > 0) {
      oss << ",";
    }
    oss << u.children[i];
  }
  oss << "],";
  oss << "\"level\":" << u.level << ",";
  oss << "\"qualified\":" << (u.qualified ? "true" : "false") << ",";
  oss << "\"qualifiedDirects\":" << u.qualifiedDirects;
  oss << "}";
  return oss.str();
}

static std::string getQueryParam(const std::string &path, const std::string &key) {
  size_t qpos = path.find('?');
  if (qpos == std::string::npos) {
    return "";
  }
  std::string query = path.substr(qpos + 1);
  std::string needle = key + "=";
  size_t pos = query.find(needle);
  if (pos == std::string::npos) {
    return "";
  }
  size_t start = pos + needle.size();
  size_t end = query.find('&', start);
  return query.substr(start, end == std::string::npos ? std::string::npos : end - start);
}

static uint32_t parseUInt(const std::string &s) {
  if (s.empty()) {
    return 0;
  }
  return static_cast<uint32_t>(std::strtoul(s.c_str(), nullptr, 10));
}

static float parseFloat(const std::string &s) {
  if (s.empty()) {
    return 0;
  }
  return std::strtof(s.c_str(), nullptr);
}

static uint32_t extractUserId(const std::string &body) {
  size_t p = body.find("\"userId\"");
  if (p == std::string::npos) {
    return 0;
  }
  size_t colon = body.find(':', p);
  if (colon == std::string::npos) {
    return 0;
  }
  size_t end = body.find_first_of(",}", colon + 1);
  return parseUInt(body.substr(colon + 1, end - colon - 1));
}

static float extractVolume(const std::string &body) {
  size_t p = body.find("\"volume\"");
  if (p == std::string::npos) {
    return 0;
  }
  size_t colon = body.find(':', p);
  if (colon == std::string::npos) {
    return 0;
  }
  size_t end = body.find_first_of(",}", colon + 1);
  return parseFloat(body.substr(colon + 1, end - colon - 1));
}

static void sendResponse(int client, int statusCode, const std::string &statusText,
                         const std::string &body, const std::string &contentType = "application/json") {
  std::ostringstream response;
  response << "HTTP/1.1 " << statusCode << " " << statusText << "\r\n";
  response << "Content-Type: " << contentType << "\r\n";
  response << "Access-Control-Allow-Origin: *\r\n";
  response << "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n";
  response << "Access-Control-Allow-Headers: Content-Type\r\n";
  response << "Content-Length: " << body.size() << "\r\n";
  response << "Connection: close\r\n\r\n";
  response << body;
  std::string serialized = response.str();
  send(client, serialized.c_str(), serialized.size(), 0);
}

int main() {
  std::srand(static_cast<unsigned int>(std::time(nullptr)));
  int userCount = 100000;
  if (const char *envUsers = std::getenv("CPP_ENGINE_USER_COUNT")) {
    userCount = std::max(1000, std::atoi(envUsers));
  }

  std::cout << "C++ engine booting..." << std::endl;
  try {
    allUsers = loadFromDBOrThrow();
    std::cout << allUsers.size() << " users loaded from PostgreSQL." << std::endl;
  } catch (const std::exception &e) {
    std::cout << "DB load failed: " << e.what() << std::endl;
    std::cout << "Falling back to generated data with " << userCount << " users." << std::endl;
    allUsers = generateTree(userCount);
  }

  int serverFd = socket(AF_INET, SOCK_STREAM, 0);
  if (serverFd < 0) {
    std::cerr << "Failed to create socket" << std::endl;
    return 1;
  }

  int opt = 1;
  setsockopt(serverFd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

  sockaddr_in address{};
  address.sin_family = AF_INET;
  address.sin_addr.s_addr = INADDR_ANY;
  address.sin_port = htons(8081);

  if (bind(serverFd, reinterpret_cast<sockaddr *>(&address), sizeof(address)) < 0) {
    std::cerr << "Bind failed" << std::endl;
    close(serverFd);
    return 1;
  }

  if (listen(serverFd, 16) < 0) {
    std::cerr << "Listen failed" << std::endl;
    close(serverFd);
    return 1;
  }

  std::cout << "C++ engine listening on :8081" << std::endl;
  while (true) {
    int client = accept(serverFd, nullptr, nullptr);
    if (client < 0) {
      continue;
    }

    char buffer[65536];
    std::memset(buffer, 0, sizeof(buffer));
    ssize_t bytesRead = recv(client, buffer, sizeof(buffer) - 1, 0);
    if (bytesRead <= 0) {
      close(client);
      continue;
    }

    std::string req(buffer, static_cast<size_t>(bytesRead));
    size_t lineEnd = req.find("\r\n");
    if (lineEnd == std::string::npos) {
      sendResponse(client, 400, "Bad Request", "{\"error\":\"bad request\"}");
      close(client);
      continue;
    }

    std::string requestLine = req.substr(0, lineEnd);
    std::istringstream rl(requestLine);
    std::string method, path, version;
    rl >> method >> path >> version;

    if (method == "OPTIONS") {
      sendResponse(client, 200, "OK", "");
      close(client);
      continue;
    }

    size_t headerEnd = req.find("\r\n\r\n");
    std::string body = "";
    if (headerEnd != std::string::npos) {
      body = req.substr(headerEnd + 4);
    }

    if (method == "GET" && path.rfind("/calculate", 0) == 0) {
      auto resetStart = std::chrono::steady_clock::now();
      for (auto &u : allUsers) {
        u.gv = 0;
        u.bonus = 0;
        u.rank = "";
        u.maxBranch = 0;
      }
      auto calcStart = std::chrono::steady_clock::now();
      calculate(allUsers);
      auto calcEnd = std::chrono::steady_clock::now();
      auto resetMs = std::chrono::duration_cast<std::chrono::milliseconds>(calcStart - resetStart).count();
      auto calcMs = std::chrono::duration_cast<std::chrono::milliseconds>(calcEnd - calcStart).count();

      std::map<std::string, int> ranksMap;
      float totalBonus = 0;
      float totalVolume = 0;
      int rankUps = 0;
      for (const auto &u : allUsers) {
        ranksMap[u.rank]++;
        totalBonus += u.bonus;
        totalVolume += u.pv4;
        if (u.rank != u.prevRank && u.rank != "Deudores") {
          rankUps++;
        }
      }

      stats.totalUsers = static_cast<int>(allUsers.size());
      stats.executionTime = std::to_string(calcMs) + "ms";
      stats.totalVolume = totalVolume;
      stats.totalBonus = totalBonus;
      stats.avgPv4 = allUsers.empty() ? 0 : (totalVolume / static_cast<float>(allUsers.size()));
      stats.ranksSummary = ranksMap;
      stats.rankUps = rankUps;
      stats.logs = {
          "Iniciando motor C++...",
          "| MOTOR FUXION PRO-LEV-X - C++ ENGINE |",
          "Cargando Periodo Activo... [OK]",
          "Reseteo en " + std::to_string(resetMs) + "ms [OK]",
          "Calculo final en " + std::to_string(calcMs) + "ms [OK]",
      };

      sendResponse(client, 200, "OK", statsToJson(stats));
    } else if (method == "GET" && path.rfind("/tree", 0) == 0) {
      std::string idStr = getQueryParam(path, "id");
      uint32_t id = parseUInt(idStr);
      if (id >= allUsers.size()) {
        sendResponse(client, 404, "Not Found", "{\"error\":\"user not found\"}");
      } else {
        sendResponse(client, 200, "OK", userToJson(allUsers[id]));
      }
    } else if (method == "POST" && path.rfind("/transaction", 0) == 0) {
      uint32_t userId = extractUserId(body);
      float volume = extractVolume(body);
      if (userId < allUsers.size()) {
        allUsers[userId].pv4 += volume;
      }
      sendResponse(client, 202, "Accepted", "{\"status\":\"accepted\"}");
    } else {
      sendResponse(client, 404, "Not Found", "{\"error\":\"not found\"}");
    }

    close(client);
  }
}
