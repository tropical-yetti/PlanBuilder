import { Canvas, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { getComponent, getItem } from '../library/registry'
import { ELEVATION_PARAM, type Box3, type Material } from '../library/types'
import { angleOf, boundsOf, normalize, sub } from '../model/geometry'
import { quantities, type Room } from '../model/quantities'
import { wallPolygons } from '../model/wallGeometry'
import type { Item, Opening, Project } from '../model/types'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { buildWallPieces, type WallPiece } from './buildWalls'
import { setCapturer } from './capture'

/** O documento é em centímetros; a cena 3D, em metros. */
const CM = 0.01
const COLORS = {
  background: '#e3e9f0',
  ground: '#c3ccd6',
  floor: '#f7f3ea',
  wallSide: '#f8fafc',
  partitionTop: '#9aa4b2',
  panelTop: '#d7dce3',
  wallTop: '#4b5563',
  wallSelected: '#bfdbfe',
  frame: '#f1f5f9',
  leaf: '#c8a27a',
  glass: '#9cc9f5',
}

/** Cores dos materiais das peças 3D de portas, janelas, cobogós e móveis. */
const MATERIALS: Record<Exclude<Material, 'glass'>, string> = {
  frame: '#f1f5f9',
  leaf: '#c8a27a',
  concrete: '#e9e3d8',
  wood: '#b98d62',
  fabric: '#8a9bb0',
  cushion: '#a7b6c8',
  sheet: '#f8f6f2',
  pillow: '#ffffff',
  metal: '#6b7280',
  steel: '#c9ced4',
  enamel: '#f5f6f7',
  dark: '#2b2f36',
  cabinet: '#f4f2ee',
  stone: '#8e8a86',
}

/** Contorno em planta → forma do three. O y da planta vira o z da cena (por isso o sinal trocado). */
function toShape(points: { x: number; y: number }[]): THREE.Shape {
  const shape = new THREE.Shape()
  points.forEach((q, i) => (i === 0 ? shape.moveTo(q.x, -q.y) : shape.lineTo(q.x, -q.y)))
  shape.closePath()
  return shape
}

function WallMesh({ piece, selected }: { piece: WallPiece; selected: boolean }) {
  const shape = useMemo(() => toShape(piece.points), [piece.points])
  return (
    <mesh position={[0, piece.y0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <extrudeGeometry args={[shape, { depth: piece.y1 - piece.y0, bevelEnabled: false }]} />
      {/* material 0: tampas (topo escuro, como na planta); material 1: faces laterais */}
      <meshStandardMaterial attach="material-0" color={piece.wallKind === 'panel' ? COLORS.panelTop : piece.wallKind === 'partition' ? COLORS.partitionTop : COLORS.wallTop} roughness={0.9} />
      <meshStandardMaterial attach="material-1" color={selected ? COLORS.wallSelected : COLORS.wallSide} roughness={0.95} />
    </mesh>
  )
}

function FloorMesh({ room }: { room: Room }) {
  const shapes = useMemo(
    () =>
      room.shape.map((poly) => {
        const [outer, ...holes] = poly
        const shape = toShape((outer ?? []).map(([x, y]) => ({ x, y })))
        for (const h of holes) shape.holes.push(toShape(h.map(([x, y]) => ({ x, y }))))
        return shape
      }),
    [room.shape],
  )
  return (
    <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <shapeGeometry args={[shapes]} />
      <meshStandardMaterial color={COLORS.floor} roughness={1} side={THREE.DoubleSide} />
    </mesh>
  )
}

function BoxMesh({ b }: { b: Box3 }) {
  const material =
    b.mat === 'glass' ? (
      <meshStandardMaterial color={COLORS.glass} transparent opacity={0.4} roughness={0.1} side={THREE.DoubleSide} />
    ) : (
      <meshStandardMaterial color={MATERIALS[b.mat]} roughness={b.mat === 'metal' ? 0.5 : 0.85} side={THREE.DoubleSide} />
    )
  const px = b.pivot?.x ?? 0
  const pz = b.pivot?.z ?? 0
  return (
    // Folhas entreabertas giram em torno da dobradiça (o ângulo positivo abre para o lado +z).
    <group position={[px, 0, pz]} rotation={[0, (-(b.angle ?? 0) * Math.PI) / 180, 0]}>
      <mesh position={[b.x - px, b.y, b.z - pz]}>
        {b.shape === 'cylinder' ? <cylinderGeometry args={[b.w / 2, b.w / 2, b.h, 40]} /> : <boxGeometry args={[b.w, b.h, b.d]} />}
        {material}
      </mesh>
    </group>
  )
}

function OpeningModel({ project, o }: { project: Project; o: Opening }) {
  const w = project.walls[o.wallId]
  const a = w && project.nodes[w.a]
  const b = w && project.nodes[w.b]
  const boxes = useMemo(
    () => (w ? getComponent(o.componentId).model({ width: o.width, height: Math.min(o.height, w.height - o.sillHeight), thickness: w.thickness, params: o.params }) : []),
    [o.componentId, o.width, o.height, o.sillHeight, o.params, w],
  )
  if (!w || !a || !b) return null
  const dir = normalize(sub(b, a))
  return (
    <group
      position={[a.x + dir.x * o.offset, o.sillHeight, a.y + dir.y * o.offset]}
      rotation={[0, -angleOf(dir), 0]}
      scale={[o.flipHinge ? -1 : 1, 1, o.flipSide ? -1 : 1]}
    >
      {boxes.map((box, i) => (
        <BoxMesh key={i} b={box} />
      ))}
    </group>
  )
}

/** Altura do piso até a base do móvel (armário aéreo, lava-louças de bancada); 0 para os demais. */
function elevationOf(item: Item): number {
  const v = item.params[ELEVATION_PARAM]
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0
}

function ItemModel({ item }: { item: Item }) {
  const boxes = useMemo(
    () => getItem(item.componentId).model({ width: item.width, depth: item.depth, height: item.height, params: item.params }),
    [item.componentId, item.width, item.depth, item.height, item.params],
  )
  // Mesmo sistema das aberturas: x local na largura, z local na profundidade (a frente do móvel).
  return (
    <group position={[item.x, elevationOf(item), item.y]} rotation={[0, (-item.rotation * Math.PI) / 180, 0]} scale={[item.mirrored ? -1 : 1, 1, 1]}>
      {boxes.map((box, i) => (
        <BoxMesh key={i} b={box} />
      ))}
    </group>
  )
}

interface Framing {
  center: THREE.Vector3
  /** Maior dimensão da planta, em metros. */
  size: number
}

/** Centro e distância de câmera para enquadrar a planta inteira (em metros). */
function framing(project: Project): Framing {
  const b = boundsOf([...wallPolygons(project).values()].flatMap((w) => w.points))
  if (!b) return { center: new THREE.Vector3(0, 1, 0), size: 6 }
  const size = Math.max(b.maxX - b.minX, b.maxY - b.minY) * CM
  return { center: new THREE.Vector3(((b.minX + b.maxX) / 2) * CM, 1, ((b.minY + b.maxY) / 2) * CM), size: Math.max(3, size) }
}

/** Câmera em órbita (arrastar gira, roda aproxima, botão direito desloca) e a "foto" para exportar. */
function CameraRig({ frame, fitKey, onReady }: { frame: Framing; fitKey: string; onReady: () => void }) {
  const { camera, gl, scene, invalidate, size: viewport } = useThree()
  const aspect = viewport.width / Math.max(1, viewport.height)
  const aspectRef = useRef(aspect)
  useEffect(() => {
    aspectRef.current = aspect
  }, [aspect])
  const controls = useRef<OrbitControls | null>(null)
  const latest = useRef(frame)
  useEffect(() => {
    latest.current = frame
  }, [frame])

  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement)
    c.enableDamping = false
    c.maxPolarAngle = Math.PI / 2 - 0.02 // não deixa a câmera ir para baixo do piso
    c.minDistance = 1
    c.maxDistance = 400
    c.addEventListener('change', () => invalidate())
    controls.current = c
    return () => c.dispose()
  }, [camera, gl, invalidate])

  // Enquadra ao abrir, ao trocar de projeto e quando o usuário pede.
  useEffect(() => {
    const { center, size } = latest.current
    // Em telas estreitas (vista dividida) a câmera se afasta mais, para a planta caber na largura.
    const distance = (size * 1.5 + 2) / Math.min(1, aspectRef.current)
    // Vista de cima, inclinada cerca de 35°: mostra o interior até de cômodos pequenos, sem as paredes esconderem os móveis.
    camera.position.set(center.x + distance * 0.3, distance * 0.95, center.z + distance * 0.6)
    controls.current?.target.copy(center)
    controls.current?.update()
    invalidate()
  }, [camera, fitKey, invalidate])

  useEffect(() => {
    setCapturer((pixelRatio) => {
      const before = gl.getPixelRatio()
      gl.setPixelRatio(Math.min(pixelRatio, 8192 / Math.max(gl.domElement.clientWidth, gl.domElement.clientHeight, 1)))
      gl.render(scene, camera)
      // A leitura precisa acontecer logo depois de desenhar, antes de o navegador limpar a tela.
      return new Promise<Blob>((resolve, reject) => {
        gl.domElement.toBlob((blob) => {
          gl.setPixelRatio(before)
          invalidate()
          if (blob) resolve(blob)
          else reject(new Error('Não foi possível gerar a imagem 3D.'))
        }, 'image/png')
      })
    })
    onReady()
    return () => setCapturer(null)
  }, [camera, gl, scene, invalidate, onReady])

  return null
}

function World({ project, selection }: { project: Project; selection: string[] }) {
  const pieces = useMemo(() => buildWallPieces(project), [project])
  const rooms = quantities(project).rooms
  const selected = useMemo(() => new Set(selection), [selection])
  return (
    <group scale={CM}>
      {pieces.map((piece, i) => (
        <WallMesh key={`${piece.wallId}-${i}-${piece.kind}`} piece={piece} selected={selected.has(piece.wallId)} />
      ))}
      {rooms.map((room) => (
        <FloorMesh key={room.key} room={room} />
      ))}
      {Object.values(project.openings).map((o) => (
        <OpeningModel key={o.id} project={project} o={o} />
      ))}
      {Object.values(project.items).map((it) => (
        <ItemModel key={it.id} item={it} />
      ))}
    </group>
  )
}

/** Vista 3D: gerada do mesmo documento da planta, atualizada a cada edição. */
export default function Scene3D() {
  const project = useProjectStore((s) => s.project)
  const selection = useEditorStore((s) => s.selection)
  const viewMode = useEditorStore((s) => s.viewMode)
  const [fitToken, setFitToken] = useState(0)
  // A cena é montada alguns instantes depois do contêiner; `ready` avisa quando já pode ser exportada.
  const [ready, setReady] = useState(false)
  const onReady = useCallback(() => setReady(true), [])
  const frame = useMemo(() => framing(project), [project])
  const empty = Object.keys(project.walls).length === 0

  return (
    <div
      className="scene3d"
      data-testid="scene3d"
      data-ready={ready}
      // Arrastar a câmera para fora da vista 3D não deve selecionar o texto da página.
      onMouseDown={(e) => {
        if (e.target instanceof HTMLCanvasElement) e.preventDefault()
      }}
    >
      {/* `flat`: sem ajuste de tom, as cores saem como definidas (paredes realmente claras). */}
      <Canvas flat frameloop="demand" camera={{ fov: 45, near: 0.1, far: 2000 }} gl={{ antialias: true }} dpr={[1, 2]}>
        <color attach="background" args={[COLORS.background]} />
        {/* Luz ambiente moderada + uma luz direcional forte: cada face da parede fica com um tom diferente. */}
        <ambientLight intensity={1.5} />
        <hemisphereLight args={['#ffffff', '#b6c0cc', 0.8]} />
        <directionalLight position={[5, 12, 7]} intensity={1.3} />
        <directionalLight position={[-8, 6, -6]} intensity={0.35} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[frame.center.x, -0.005, frame.center.z]}>
          <circleGeometry args={[Math.max(40, frame.size * 8), 64]} />
          <meshStandardMaterial color={COLORS.ground} roughness={1} />
        </mesh>
        <World project={project} selection={selection} />
        {/* Trocar de projeto, alternar entre 3D e Dividido (a largura muda) ou clicar em Enquadrar reposiciona a câmera. */}
        <CameraRig frame={frame} fitKey={`${project.id}:${viewMode}:${fitToken}`} onReady={onReady} />
      </Canvas>
      {empty && <p className="placeholder scene3d-empty">Desenhe paredes na planta para vê-las em 3D.</p>}
      <div className="scene3d-tools">
        <button type="button" className="btn outline" onClick={() => setFitToken((n) => n + 1)} title="Volta a câmera para ver a planta inteira">
          Enquadrar
        </button>
      </div>
      <p className="scene3d-hint">Arraste para girar · roda para aproximar · botão direito para deslocar</p>
    </div>
  )
}
