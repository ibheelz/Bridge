import * as THREE from 'three';

/**
 * Where the sun is for the visitor, right now. Longitude comes from the time
 * zone's standard offset and latitude is a fixed guess, unless the visitor has
 * already allowed this site to use their location (the site never asks).
 * `?time=HH:MM` in the URL pretends it is that local time today, for checking.
 */

const RAD = Math.PI / 180;

/** Sun elevation in degrees (NOAA's simplified equations). `longitude` is east-positive. */
export function sunElevation(date: Date, latitude: number, longitude: number): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - start) / 86_400_000) + 1;
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hours - 12) / 24);

  const eqTime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);

  const trueSolarMinutes = hours * 60 + eqTime + 4 * longitude;
  const hourAngle = (trueSolarMinutes / 4 - 180) * RAD;
  const lat = latitude * RAD;
  const cosZenith = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);
  return 90 - Math.acos(THREE.MathUtils.clamp(cosZenith, -1, 1)) / RAD;
}

/** Longitude implied by the time zone's standard (non-daylight-saving) offset. */
export function longitudeFromTimeZone(now: Date): number {
  const year = now.getFullYear();
  // getTimezoneOffset is UTC minus local, in minutes; the larger of January and July is standard time.
  const standard = Math.max(new Date(year, 0, 1).getTimezoneOffset(), new Date(year, 6, 1).getTimezoneOffset());
  return -standard / 4;
}

/** `?time=HH:MM` → that local time today; otherwise null. */
export function timeOverride(): Date | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(window.location.search).get('time') ?? '');
  if (!match) return null;
  const date = new Date();
  date.setHours(Math.min(23, Number(match[1])), Math.min(59, Number(match[2])), 0, 0);
  return date;
}

/** Latitude used when the real one is unknown (degrees north). */
export const DEFAULT_LATITUDE = 30;

/** Real coordinates, only if permission was already granted; never prompts. */
export function knownLocation(callback: (latitude: number, longitude: number) => void): void {
  const permissions = navigator.permissions;
  if (!permissions?.query || !navigator.geolocation) return;
  permissions
    .query({ name: 'geolocation' as PermissionName })
    .then((status) => {
      if (status.state !== 'granted') return;
      navigator.geolocation.getCurrentPosition(
        (position) => callback(position.coords.latitude, position.coords.longitude),
        () => {},
        { maximumAge: 3_600_000, timeout: 10_000 },
      );
    })
    .catch(() => {});
}
