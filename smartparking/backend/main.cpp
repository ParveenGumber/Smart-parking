
#include "parking.h"
#include "httplib.h"
#include "fee_calculator.h"

#include <filesystem>
#include <iostream>
#include <string>

using namespace httplib;
namespace fs = std::filesystem;

// Escape special characters before placing strings in JSON.
std::string jsonEscape(const std::string& input)
{
    std::string output;

    for (unsigned char ch : input) {
        switch (ch) {
            case '"':
                output += "\\\"";
                break;

            case '\\':
                output += "\\\\";
                break;

            case '\b':
                output += "\\b";
                break;

            case '\f':
                output += "\\f";
                break;

            case '\n':
                output += "\\n";
                break;

            case '\r':
                output += "\\r";
                break;

            case '\t':
                output += "\\t";
                break;

            default:
                if (ch < 0x20) {
                    output += ' ';
                } else {
                    output += static_cast<char>(ch);
                }
        }
    }

    return output;
}

// Convert a C++ string into a valid JSON string.
std::string jsonString(const std::string& value)
{
    return "\"" + jsonEscape(value) + "\"";
}

int main()
{
    ParkingManager manager;
    Server server;

    // Locate the frontend directory relative to the backend directory.
    const fs::path frontendPath = fs::absolute("../frontend");

    if (!fs::exists(frontendPath / "index.html")) {
        std::cerr << "Error: frontend/index.html not found.\n";
        std::cerr << "Run parking.exe from the backend folder.\n";
        return 1;
    }

    // Serve index.html, style.css and script.js.
    if (!server.set_mount_point("/", frontendPath.string())) {
        std::cerr << "Error: Could not mount frontend directory.\n";
        return 1;
    }

    // ==========================================
    // DASHBOARD API
    // ==========================================
    server.Get("/api/dashboard",
        [&](const Request&, Response& response) {
            response.set_header("Cache-Control", "no-store");

            std::string json =
                "{"
                "\"totalSlots\":" +
                std::to_string(manager.getTotalSlots()) +
                ",\"availableSlots\":" +
                std::to_string(manager.getAvailableSlots()) +
                ",\"occupiedSlots\":" +
                std::to_string(manager.getOccupiedSlots()) +
                ",\"totalRevenue\":" +
                std::to_string(manager.getTotalRevenue()) +
                "}";

            response.set_content(json, "application/json");
        }
    );

    // ==========================================
    // PARKING SLOTS API
    // ==========================================
    server.Get("/api/slots",
        [&](const Request&, Response& response) {
            response.set_header("Cache-Control", "no-store");

            std::string json = "{\"slots\":[";
            bool first = true;

            for (const auto& slot : manager.getSlots()) {
                if (!first) {
                    json += ",";
                }

                first = false;

                json += "{\"id\":" + jsonString(slot.id);

                json += ",\"occupied\":";
                json += slot.occupied ? "true" : "false";

                json += ",\"vehicleNumber\":";

                if (slot.occupied) {
                    json += jsonString(slot.vehicleNumber);
                } else {
                    json += "null";
                }

                json += "}";
            }

            json += "]}";

            response.set_content(json, "application/json");
        }
    );

    // ==========================================
    // VEHICLE ENTRY API
    // ==========================================
    server.Post("/api/entry",
        [&](const Request& request, Response& response) {
            response.set_header("Cache-Control", "no-store");

            if (!request.has_param("vehicleNumber") ||
                !request.has_param("vehicleType")) {

                response.status = 400;

                response.set_content(
                    "{\"error\":\"Vehicle number and type are required.\"}",
                    "application/json"
                );

                return;
            }

            const std::string number =
                request.get_param_value("vehicleNumber");

            const std::string type =
                request.get_param_value("vehicleType");

            std::string slot;
            std::string message;

            const bool success = manager.vehicleEntry(
                number,
                type,
                slot,
                message
            );

            if (!success) {
                response.status = 400;

                response.set_content(
                    "{\"error\":" + jsonString(message) + "}",
                    "application/json"
                );

                return;
            }

            response.set_content(
                "{\"message\":" + jsonString(message) +
                ",\"slot\":" + jsonString(slot) + "}",
                "application/json"
            );
        }
    );

    // ==========================================
    // VEHICLE EXIT API
    // ==========================================
    server.Post("/api/exit",
        [&](const Request& request, Response& response) {
            response.set_header("Cache-Control", "no-store");

            if (!request.has_param("vehicleNumber")) {
                response.status = 400;

                response.set_content(
                    "{\"error\":\"Vehicle number is required.\"}",
                    "application/json"
                );

                return;
            }

            const std::string number =
                request.get_param_value("vehicleNumber");

            int fee = 0;
            int durationMinutes = 0;
            std::string message;

            const bool success = manager.vehicleExit(
                number,
                fee,
                durationMinutes,
                message
            );

            if (!success) {
                response.status = 400;

                response.set_content(
                    "{\"error\":" + jsonString(message) + "}",
                    "application/json"
                );

                return;
            }

            std::string json =
                "{\"message\":" + jsonString(message) +
                ",\"fee\":" + std::to_string(fee) +
                ",\"durationMinutes\":" +
                std::to_string(durationMinutes) + "}";

            response.set_content(json, "application/json");
        }
    );

    // ==========================================
    // PARKING HISTORY API
    // ==========================================
    server.Get("/api/history",
        [&](const Request&, Response& response) {
            response.set_header("Cache-Control", "no-store");

            std::string json = "{\"records\":[";
            bool first = true;

            for (const auto& record : manager.getHistory()) {
                if (!first) {
                    json += ",";
                }

                first = false;

                json += "{\"vehicleNumber\":";
                json += jsonString(record.vehicleNumber);

                json += ",\"vehicleType\":";
                json += jsonString(record.vehicleType);

                json += ",\"slot\":";
                json += jsonString(record.slot);

                json += ",\"entryTime\":";
                json += std::to_string(record.entryTime);

                json += ",\"exitTime\":";
                json += std::to_string(record.exitTime);

                json += ",\"durationMinutes\":";
                json += std::to_string(record.durationMinutes);

                json += ",\"fee\":";
                json += std::to_string(record.fee);

                json += ",\"status\":";
                json += jsonString(
                    record.completed ? "completed" : "parked"
                );

                json += "}";
            }

            json += "]}";

            response.set_content(json, "application/json");
        }
    );

    // ==========================================
    // START HTTP SERVER
    // ==========================================
    const char* host = "127.0.0.1";
    const int port = 8080;

    std::cout << "====================================\n";
    std::cout << "      SMART PARKING WEB SERVER\n";
    std::cout << "====================================\n";
    std::cout << "Open: http://127.0.0.1:8080\n";
    std::cout << "Press Ctrl+C to stop the server.\n";

    if (!server.listen(host, port)) {
        std::cerr << "Could not start the server on port "
                  << port << ".\n";

        return 1;
    }

    return 0;
}

