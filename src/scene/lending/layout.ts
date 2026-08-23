import * as THREE from 'three'
import type { TokenId } from '../../sim/pool'

// One place for "where things are" in the lending scene, shared by the
// tank, the scale, the flasks, the liquidator, and the pour streams.

export const LEND_FLASKS: [number, number, number] = [-3.6, 0, 1.4]
export const SCALE_POS: [number, number, number] = [3.0, 0, 1.5]

export const LIQUIDATOR_START_RADIUS = 7.5

export function lendFlaskTop(token: TokenId): THREE.Vector3 {
  const dx = token === 'GEM' ? -0.55 : 0.55
  return new THREE.Vector3(LEND_FLASKS[0] + dx, 1.6, LEND_FLASKS[2])
}

export const tankTop = (): THREE.Vector3 => new THREE.Vector3(0, 3.4, 0)

// The collateral flask sits on the scale's left pan; streams aim there.
export const collateralPanTop = (): THREE.Vector3 =>
  new THREE.Vector3(SCALE_POS[0] - 0.9, 2.2, SCALE_POS[2])

export const debtPanTop = (): THREE.Vector3 =>
  new THREE.Vector3(SCALE_POS[0] + 0.9, 2.2, SCALE_POS[2])

// Liquidators (and any walker) stand on a ray from the origin.
export function walkerSpot(angle: number, radius: number): THREE.Vector3 {
  return new THREE.Vector3(Math.sin(angle) * radius, 0, Math.cos(angle) * radius)
}
