# CATALYST — QC Digital Management System

CATALYST is a self-built quality control management system developed for an apparel manufacturing environment, covering the full inspection workflow from cutting to final inspection. It was designed and built independently by a QC Supervisor to replace a manual, paper-based reporting process with a structured digital system.

This repository contains a sanitized demo version of the system. All company identity, personnel data, and production data have been replaced with representative dummy data for public presentation. No backend or live data source is connected.

## Background

Prior to this system, quality reporting was handled through a combination of WhatsApp messages and manual Excel sheets, with physical printing required at several stages of the process. This created delays in reporting, inconsistent data recording, and unnecessary paper consumption.

CATALYST was built to consolidate the entire QC workflow into a single digital system, covering cutting, sewing, washing, finishing, and final inspection, along with supporting tools for KPI tracking, defect terminology reference, and report generation.

## Modules

| Module | Description |
|---|---|
| Hub | Central navigation point for all QC modules |
| SPV Dashboard | Consolidated overview across sewing, finishing, and washing |
| KPI Inspector | Individual inspector performance and skill tracking |
| Cutting QC | Inspection recording for the cutting stage |
| Sewing QC | Inspection recording for the sewing stage |
| Washing QC | Inspection recording for the washing stage |
| Finishing QC | Inspection recording for the finishing stage |
| Final Inspection | Final inspection summary and reporting |
| Tracker | Production and inspection data tracking |
| Kamus QC | Internal defect terminology reference |
| PDF / Spreadsheet Tools | Report generation and export utilities |

## Impact

Measured over the period from 2025 to July 2026, after implementation of the system:

- Sewing rejection rate reduced from 13% to 7%
- Finishing rejection rate reduced from 4% to 1%
- Back-to-line rate reduced from 11% to 5%
- Final passed rate increased from 99.2% to 99.5%
- Paper usage for QC reporting reduced from approximately 2,300 to 1,500 sheets per month
- Reliance on manual Excel-based reporting significantly reduced
- Individual inspector skill matrix introduced, supporting structured training and development

## Tech Stack

- HTML, CSS, JavaScript (vanilla, no framework)
- Chart.js for data visualization
- SweetAlert2 for interface dialogs
- Originally connected to Google Sheets via Google Apps Script as a lightweight backend; this demo version runs fully client-side with generated dummy data

## Demo Notes

This is a public portfolio version. To protect confidential company information:

- All references to the original company and brand have been replaced
- All production, defect, and personnel data are randomly generated for demonstration purposes and do not reflect real operational figures
- All authentication and password gates have been removed, as this version does not connect to any live data source
- The original backend connection has been fully disconnected; the system runs entirely in the browser

## Running Locally

Clone or download this repository, then open `index.html` in a browser. No build step or server is required.

## Author

Built independently by a Quality Control Supervisor with a background in garment manufacturing, as a self-initiated solution to an operational reporting problem.
