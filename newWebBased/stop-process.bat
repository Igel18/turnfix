Stop-Process -Name node -Force; cd .\server; npm run dev
Stop-Process -Name node -Force; cd .\client; npm run dev
Stop-Process -Name node -Force; cd .\Jury-portal; npm run dev