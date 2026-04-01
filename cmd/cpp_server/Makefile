CXX := g++
CXXFLAGS := -std=c++17 -O2 -Wall -Wextra -pedantic
CPPFLAGS := -I/opt/homebrew/opt/libpq/include
LDFLAGS := -L/opt/homebrew/opt/libpq/lib -lpq
TARGET := fuxion-cpp-engine
SRC := main.cpp

.PHONY: all run clean

all:
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) $(SRC) -o $(TARGET) $(LDFLAGS)

run: all
	./$(TARGET)

clean:
	rm -f $(TARGET)
