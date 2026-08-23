// A liquidator's visit to the lending scene. Purely visual scheduling:
// the app dispatches the matching `liquidate` action when the walker
// reaches its pause spot.
export interface LendVisit {
  id: number
  angle: number // ray from the scene origin
  pauseRadius: number // how close to the origin the walker stops
  who: 'user' | number
}
