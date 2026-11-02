#include "fee_calculator.h"

int calculate_parking_fee(int duration_minutes, int is_car)
{
if (duration_minutes < 0) {
return -1;
}


int hourly_rate;

if (is_car == 1) {
    hourly_rate = 40;
} else if (is_car == 0) {
    hourly_rate = 20;
} else {
    return -1;
}

int hours = duration_minutes / 60;

if (duration_minutes % 60 != 0) {
    hours++;
}

if (hours < 1) {
    hours = 1;
}

return hours * hourly_rate;


}
