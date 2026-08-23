import * as THREE from 'three'
import type { TokenId } from '../sim/pool'

// One place for "where things are", shared by the tank, the flasks,
// the trader figures, and the pour streams.

export const FLASK_GROUP: [number, number, number] = [-3.6, 0, 1.4]
export const TRADER_RADIUS = 2.4
export const TRADER_START_RADIUS = 7.5

export function flaskTop(token: TokenId): THREE.Vector3 {
  const dx = token === 'GEM' ? -0.55 : 0.55
  return new THREE.Vector3(FLASK_GROUP[0] + dx, 1.6, FLASK_GROUP[2])
}

export function chamberTop(token: TokenId): THREE.Vector3 {
  return new THREE.Vector3(token === 'GEM' ? -0.85 : 0.85, 3.4, 0)
}

// Traders stand on a ray from the tank center, picked by angle.
export function traderSpot(angle: number, radius = TRADER_RADIUS): THREE.Vector3 {
  return new THREE.Vector3(Math.sin(angle) * radius, 0, Math.cos(angle) * radius)
}

export function traderPourPoint(angle: number): THREE.Vector3 {
  return traderSpot(angle).setY(1.15)
}
