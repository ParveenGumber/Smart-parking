#ifndef PARKING_H
#define PARKING_H

#include <string> 
#include <vector>

struct Vehicle {
std::string number;
std::string type;
std::string slot;
long long entryTime;
};

struct ParkingSlot {
std::string id;
bool occupied;
std::string vehicleNumber;
};

struct ParkingRecord {
std::string vehicleNumber;
std::string vehicleType;
std::string slot;
long long entryTime;
long long exitTime;
int durationMinutes;
int fee;
bool completed;
};

class ParkingManager {
private:
std::vector<ParkingSlot> slots;
std::vector<Vehicle> activeVehicles;
std::vector<ParkingRecord> history;


public:
ParkingManager();

bool vehicleEntry(
    const std::string& number,
    const std::string& type,
    std::string& assignedSlot,
    std::string& message
);

bool vehicleExit(
    const std::string& number,
    int& fee,
    int& durationMinutes,
    std::string& message
);



void displaySlots();

void displayHistory();

int getAvailableSlots() const;

int getOccupiedSlots() const;

int getTotalSlots() const;

int getTotalRevenue() const;

const std::vector<ParkingSlot>& getSlots() const;

const std::vector<ParkingRecord>& getHistory() const;

};

#endif
