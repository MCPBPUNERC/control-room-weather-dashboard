# Control Room Weather Dashboard

Installable McPherson BPU weather dashboard using Open-Meteo at the control-room coordinates and NWS point alerts.

## Features

- Current dry bulb, calculated wet bulb, humidity, pressure, wind speed, gust and direction
- Past 24-hour charts
- Past 24-hour Excel-ready copy table, frozen until the next top of hour
- Automatic five-minute refresh
- Progressive Web App installation
- Vercel-ready Vite configuration

## Local development

```bash
npm install
npm run dev
```

## Deploy with Vercel

Import this GitHub repository into Vercel. Vercel will detect Vite and use `npm run build` with the `dist` output directory. Each push to `main` will publish a new production deployment automatically.

## Data note

Open-Meteo values are modeled for the exact coordinates, not readings from an on-site physical sensor.
