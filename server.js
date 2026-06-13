"use strict";

const http = require("http");const crypto = require("crypto");const fs = require("fs");const path = require("path");

const PORT = Number(process.env.PORT || 4173);const ROOT = __dirname;const rooms = new Map();const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";const MIME = {".html": "text/html; charset=utf-8",".js": "text/javascript; charset=utf-8",".css": "text/css; charset=utf-8",".png": "image/png",".jpg": "image/jpeg",".jpeg": "image/jpeg",".webp": "image/webp",".svg": "image/svg+xml",".json": "application/json; charset=utf-8",};

function roomCode() {
