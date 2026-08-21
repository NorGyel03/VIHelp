VIHelp WiFi Setup — Daily Procedure
Step 1 — Turn on Android Hotspot
Hotspot name: ESPTest
Password: 12345678
Band: 2.4 GHz
Step 2 — Check PC IP
Open PowerShell and run:

ipconfig | findstr "10."
Note the IP (e.g. 10.108.117.252)

Step 3 — Update frontend/.env if IP changed
EXPO_PUBLIC_API_URL=http://<PC_IP>:3000
EXPO_PUBLIC_AI_SERVICE_URL=http://<PC_IP>:5000
Step 4 — Update firmware if IP changed
Open firmware/esp32s3_devkit_ov3660_wifi/esp32s3_devkit_ov3660_wifi.ino line 56:

const char* UPLOAD_URL = "http://<PC_IP>:5000/upload";
Then reflash via Arduino IDE.

Step 5 — Start backend (Terminal 1)
cd "C:\Users\Asus\OneDrive\Desktop\VIHelp\app\assistive-ai-app - WIFI\backend"
npm start
✅ Should say: Server running on port 3000

Step 6 — Start AI service (Terminal 2)
cd "C:\Users\Asus\OneDrive\Desktop\VIHelp\app\assistive-ai-app - WIFI\ai-service"
C:\Users\Asus\anaconda3\python.exe app.py
✅ Should say: Running on http://<PC_IP>:5000

Step 7 — Start frontend (Terminal 3)
cd "C:\Users\Asus\OneDrive\Desktop\VIHelp\app\assistive-ai-app - WIFI\frontend"
npx expo start --clear
✅ Scan QR code with Expo Go

Step 8 — Power ESP32
Plug into backup charger. In Serial Monitor you should see:

[WIFI] Connected  IP: 10.x.x.128
[PUSH] Will POST frames to: http://<PC_IP>:5000/upload
What to update if IP changes
What	Where
frontend/.env	Both lines — keep :3000 and :5000
Firmware UPLOAD_URL	Line 56 of .ino → reflash
ai-service/.env	Not needed anymore