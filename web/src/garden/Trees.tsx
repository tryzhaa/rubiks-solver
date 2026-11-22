'use client'

/** [x, z, scale] for each tree, copied from the approved prototype. */
export const TREE_PLACEMENTS: [number, number, number][] = [
  [-14, -11, 1.7],
  [15, -12, 2],
  [-17, 6, 1.5],
  [16, 9, 1.7],
  [-6, -19, 1.9],
  [8, -20, 1.6],
  [1, -24, 2.2],
  [-24, -3, 1.8],
  [24, -2, 1.9],
]

/** [dx, dy, dz, radius, colour] foliage blobs relative to the trunk, before scaling. */
const FOLIAGE: [number, number, number, number, number][] = [
  [0, 2.8, 0, 1.6, 0x2f9e48],
  [0.6, 3.6, 0.2, 1.2, 0x3fb55a],
  [-0.5, 3.4, -0.3, 1.25, 0x278a3f],
]

export function Trees() {
  return (
    <>
      {TREE_PLACEMENTS.map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, s, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.2 * s, 0.3 * s, 2 * s, 7]} />
            <meshStandardMaterial color={0x6e4a2a} roughness={0.9} />
          </mesh>
          {FOLIAGE.map(([dx, dy, dz, r, color], j) => (
            <mesh key={j} position={[dx * s, dy * s, dz * s]} castShadow receiveShadow>
              <icosahedronGeometry args={[r * s, 1]} />
              <meshStandardMaterial color={color} flatShading roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}
