import * as THREE from 'three'

// Farm-scene positions. The AMM tank sits at the origin, so the shared
// scene/layout.ts positions (flasks, trader spots, chamber tops) apply
// verbatim; the lending-side positions come from scene/lending/layout.
// Only the GEM lenders' tank is new.

export const GEM_TANK_POS: [number, number, number] = [-4.3, 0, -2.2]
export const GEM_TANK_SCALE = 0.75

export const gemTankTop = (): THREE.Vector3 =>
  new THREE.Vector3(GEM_TANK_POS[0], 3.4 * GEM_TANK_SCALE, GEM_TANK_POS[2])
