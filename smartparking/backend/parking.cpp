#include "parking.h"
#include "fee_calculator.h"

#include <algorithm>
#include <cctype>
#include <ctime>
#include <iomanip>
#include <iostream>
#include <sstream>

namespace {

std::string normalizeVehicleNumber(const std::string& number)
{
std::string result;

for (unsigned char ch : number) {
    if (!std::isspace(ch)) {
        result += static_cast<char>(std::toupper(ch));
    }
}

return result;


}

long long currentTime()
{
return static_cast<long long>(std::time(nullptr));
}

} // namespace

// Initialize 12 parking slots.
ParkingManager::ParkingManager()
{
for (int i = 1; i <= 12; i++) {
std::ostringstream slotName;

    slotName << "P"
             << std::setw(2)
             << std::setfill('0')
             << i;

    slots.push_back({
        slotName.str(),
        false,
        ""
    });
}

}

// Register a vehicle and assign an available slot.
bool ParkingManager::vehicleEntry(
const std::string& number,
const std::string& type,
std::string& assignedSlot,
std::string& message
)
{
const std::string normalizedNumber =
normalizeVehicleNumber(number);
if (normalizedNumber.empty()) {
    message = "Vehicle number cannot be empty.";
    return false;
}

if (type != "car" && type != "motorcycle") {
    message = "Invalid vehicle type.";
    return false;
}

for (const auto& vehicle : activeVehicles) {
    if (vehicle.number == normalizedNumber) {
        message = "This vehicle is already parked.";
        return false;
    }
}

auto availableSlot = std::find_if(
    slots.begin(),
    slots.end(),
    [](const ParkingSlot& slot) {
        return !slot.occupied;
    }
);

if (availableSlot == slots.end()) {
    message = "Parking lot is full.";
    return false;
}

const long long entryTimestamp = currentTime();

availableSlot->occupied = true;
availableSlot->vehicleNumber = normalizedNumber;

assignedSlot = availableSlot->id;

activeVehicles.push_back({
    normalizedNumber,
    type,
    assignedSlot,
    entryTimestamp
});

history.push_back({
    normalizedNumber,
    type,
    assignedSlot,
    entryTimestamp,
    0,
    0,
    0,
    false
});

message = "Vehicle registered successfully.";
return true;

}

// Process vehicle exit and calculate its fee.
bool ParkingManager::vehicleExit(
const std::string& number,
int& fee,
int& durationMinutes,
std::string& message
)
{
const std::string normalizedNumber =
normalizeVehicleNumber(number);

auto vehicle = std::find_if(
    activeVehicles.begin(),
    activeVehicles.end(),
    [&normalizedNumber](const Vehicle& item) {
        return item.number == normalizedNumber;
    }
);

if (vehicle == activeVehicles.end()) {
    message = "No active parking record found.";
    return false;
}

const long long exitTimestamp = currentTime();

const long long elapsedSeconds =
    exitTimestamp - vehicle->entryTime;

if (elapsedSeconds < 0) {
    message = "Invalid parking timestamps.";
    return false;
}

durationMinutes = static_cast<int>(
    elapsedSeconds / 60
);

const int isCar =
    (vehicle->type == "car") ? 1 : 0;

fee = calculate_parking_fee(
    durationMinutes,
    isCar
);

if (fee < 0) {
    message = "Unable to calculate parking fee.";
    return false;
}

auto slot = std::find_if(
    slots.begin(),
    slots.end(),
    [&vehicle](const ParkingSlot& item) {
        return item.id == vehicle->slot;
    }
);

if (slot != slots.end()) {
    slot->occupied = false;
    slot->vehicleNumber.clear();
}

auto record = std::find_if(
    history.rbegin(),
    history.rend(),
    [&normalizedNumber](const ParkingRecord& item) {
        return item.vehicleNumber == normalizedNumber
            && !item.completed;
    }
);

if (record != history.rend()) {
    record->exitTime = exitTimestamp;
    record->durationMinutes = durationMinutes;
    record->fee = fee;
    record->completed = true;
}

activeVehicles.erase(vehicle);

message = "Vehicle exit processed successfully.";
return true;

}

// Display all parking slots.
void ParkingManager::displaySlots()
{
std::cout << "\n--- PARKING SLOT STATUS ---\n";

for (const auto& slot : slots) {
    std::cout << slot.id << " : ";

    if (slot.occupied) {
        std::cout << "Occupied by "
                  << slot.vehicleNumber;
    } else {
        std::cout << "Available";
    }

    std::cout << '\n';
}

}

// Display parking history.
void ParkingManager::displayHistory()
{
std::cout << "\n--- PARKING HISTORY ---\n";

for (const auto& record : history) {
    std::cout
        << "Vehicle: " << record.vehicleNumber
        << " | Type: " << record.vehicleType
        << " | Slot: " << record.slot
        << " | Status: "
        << (record.completed ? "Completed" : "Parked");

    if (record.completed) {
        std::cout
            << " | Duration: "
            << record.durationMinutes
            << " minutes | Fee: Rs. "
            << record.fee;
    }

    std::cout << '\n';
}

}

// Count available parking slots.
int ParkingManager::getAvailableSlots() const
{
return static_cast<int>(
std::count_if(
slots.begin(),
slots.end(),
[](const ParkingSlot& slot) {
return !slot.occupied;
}
)
);
}

// Count occupied parking slots.
int ParkingManager::getOccupiedSlots() const
{
return getTotalSlots() - getAvailableSlots();
}

// Return total parking capacity.
int ParkingManager::getTotalSlots() const
{
return static_cast<int>(slots.size());
}

// Calculate total revenue from completed sessions.
int ParkingManager::getTotalRevenue() const
{
int total = 0;

for (const auto& record : history) {
    if (record.completed) {
        total += record.fee;
    }
}

return total;


}

// Return actual parking slot information.
const std::vector<ParkingSlot>& ParkingManager::getSlots() const
{
return slots;
}

// Return all parking history records.
const std::vector<ParkingRecord>& ParkingManager::getHistory() const
{
return history;
}
