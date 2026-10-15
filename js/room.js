import * as THREE from 'three';

/**
 * Procedural interior: floor, walls, ceiling, desk, chair, window + AC, fridge, circulation fan, fixture.
 * Materials start dark (MeshStandardMaterial) and respond to scene lights.
 */

function std(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: extras.roughness ?? 0.85,
    metalness: extras.metalness ?? 0.05,
    ...extras,
  });
}

export class Room {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'room';
    scene.add(this.group);

    /** @type {THREE.Object3D[]} */
    this._disposables = [];

    this.ceilingAnchor = new THREE.Object3D();
    this.deskAnchor = new THREE.Object3D();
    this.bulbMesh = null;

    /** @type {THREE.MeshStandardMaterial | null} */
    this.acLedMat = null;
    /** @type {THREE.MeshStandardMaterial | null} */
    this.acCoolMat = null;
    /** @type {THREE.MeshStandardMaterial | null} */
    this.acBodyMat = null;
    /** @type {THREE.MeshStandardMaterial | null} */
    this.fridgeLedMat = null;
    /** @type {THREE.MeshStandardMaterial | null} */
    this.fanLedMat = null;
    /** @type {THREE.Group | null} */
    this.fanRoot = null;
    /** @type {THREE.Group | null} */
    this.fanBladeGroup = null;
    /** @type {THREE.Group | null} */
    this.airflowGroup = null;
    /** @type {THREE.Group | null} */
    this.stoveGroup = null;
    /** @type {THREE.Group | null} */
    this.fridgeFillGroup = null;
    this._fanPlacement = 'correct';

    this._buildShell();
    this._buildWindow();
    this._buildWindowAC();
    this._buildFurniture();
    this._buildFridge();
    this._buildStove();
    this._buildCirculationFan();
    this._buildAirflowHints();
    this._buildFixture();
  }

  _track(obj) {
    this._disposables.push(obj);
    return obj;
  }

  _mesh(geo, mat, opts = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = opts.cast !== false;
    m.receiveShadow = opts.receive !== false;
    if (opts.pos) m.position.copy(opts.pos);
    if (opts.rot) m.rotation.set(opts.rot.x || 0, opts.rot.y || 0, opts.rot.z || 0);
    this.group.add(m);
    this._track(geo);
    return m;
  }

  _buildShell() {
    const W = 8;
    const D = 7;
    const H = 3.2;

    this.size = { W, D, H };

    // Floor
    this._mesh(
      new THREE.PlaneGeometry(W, D),
      std(0x1a1816, { roughness: 0.92 }),
      { pos: new THREE.Vector3(0, 0, 0), rot: { x: -Math.PI / 2 }, cast: false }
    );

    // Ceiling
    this._mesh(
      new THREE.PlaneGeometry(W, D),
      std(0x12141a, { roughness: 0.95 }),
      { pos: new THREE.Vector3(0, H, 0), rot: { x: Math.PI / 2 }, cast: false }
    );

    const wallMat = std(0x22242c, { roughness: 0.9 });
    const wallMatB = std(0x1e2028, { roughness: 0.9 });

    // Back wall at z = -D/2
    this._mesh(
      new THREE.PlaneGeometry(W, H),
      wallMat,
      { pos: new THREE.Vector3(0, H / 2, -D / 2), cast: false }
    );
    // Front wall
    this._mesh(
      new THREE.PlaneGeometry(W, H),
      wallMatB,
      { pos: new THREE.Vector3(0, H / 2, D / 2), rot: { y: Math.PI }, cast: false }
    );
    // Left
    this._mesh(
      new THREE.PlaneGeometry(D, H),
      wallMatB,
      { pos: new THREE.Vector3(-W / 2, H / 2, 0), rot: { y: Math.PI / 2 }, cast: false }
    );
    // Right
    this._mesh(
      new THREE.PlaneGeometry(D, H),
      wallMat,
      { pos: new THREE.Vector3(W / 2, H / 2, 0), rot: { y: -Math.PI / 2 }, cast: false }
    );

    // Baseboard strip on back wall
    this._mesh(
      new THREE.BoxGeometry(W - 0.05, 0.08, 0.04),
      std(0x0e0f14, { roughness: 0.7 }),
      { pos: new THREE.Vector3(0, 0.04, -D / 2 + 0.03), cast: false }
    );
  }

  _buildWindow() {
    const { W, D, H } = this.size;
    // Window on left wall — upper pane; lower opening reserved for window AC
    const frameMat = std(0x2a2c34, { roughness: 0.6, metalness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x05060a,
      roughness: 0.15,
      metalness: 0.3,
      emissive: 0x020308,
      emissiveIntensity: 0.15,
    });
    this._track(glassMat);

    const wx = -W / 2 + 0.06;
    const wy = H * 0.62;
    const wz = -0.4;
    this.windowPos = { x: wx, y: wy, z: wz };

    // Outer frame (taller to include AC bay)
    this._mesh(
      new THREE.BoxGeometry(0.08, 1.85, 1.45),
      frameMat,
      { pos: new THREE.Vector3(wx, H * 0.5, wz), cast: true }
    );

    // Upper glass (outside dark)
    this._mesh(
      new THREE.PlaneGeometry(1.15, 0.85),
      glassMat,
      {
        pos: new THREE.Vector3(wx + 0.05, wy, wz),
        rot: { y: Math.PI / 2 },
        cast: false,
      }
    );

    // Vertical mullion (upper)
    this._mesh(
      new THREE.BoxGeometry(0.05, 0.85, 0.06),
      frameMat,
      { pos: new THREE.Vector3(wx + 0.02, wy, wz), cast: false }
    );
    // Horizontal mullion separating glass / AC
    this._mesh(
      new THREE.BoxGeometry(0.06, 0.06, 1.35),
      frameMat,
      { pos: new THREE.Vector3(wx + 0.02, H * 0.42, wz), cast: false }
    );
  }

  /**
   * Classic HK window-type AC sitting in the lower window bay.
   */
  _buildWindowAC() {
    const { W, H } = this.size;
    const wx = -W / 2 + 0.28;
    const wy = H * 0.28;
    const wz = -0.4;

    this.acBodyMat = std(0xb0b6be, { roughness: 0.55, metalness: 0.25 });
    this._track(this.acBodyMat);

    const grilleMat = std(0x3a4048, { roughness: 0.7, metalness: 0.35 });
    const darkMat = std(0x1e2228, { roughness: 0.8, metalness: 0.2 });

    this.acCoolMat = new THREE.MeshStandardMaterial({
      color: 0x2a3038,
      roughness: 0.65,
      metalness: 0.15,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    this._track(this.acCoolMat);

    this.acLedMat = new THREE.MeshStandardMaterial({
      color: 0x1a1c20,
      roughness: 0.4,
      metalness: 0.1,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    this._track(this.acLedMat);

    // Main chassis (protrudes into room)
    this._mesh(
      new THREE.BoxGeometry(0.55, 0.42, 0.72),
      this.acBodyMat,
      { pos: new THREE.Vector3(wx, wy, wz) }
    );

    // Front face plate
    this._mesh(
      new THREE.BoxGeometry(0.04, 0.38, 0.68),
      darkMat,
      { pos: new THREE.Vector3(wx + 0.28, wy, wz), cast: false }
    );

    // Horizontal vent louvers (cool discharge)
    for (let i = 0; i < 5; i++) {
      this._mesh(
        new THREE.BoxGeometry(0.03, 0.012, 0.55),
        this.acCoolMat,
        {
          pos: new THREE.Vector3(wx + 0.305, wy + 0.08 - i * 0.035, wz),
          cast: false,
        }
      );
    }

    // Side intake grille (slots)
    for (let i = 0; i < 6; i++) {
      this._mesh(
        new THREE.BoxGeometry(0.35, 0.015, 0.02),
        grilleMat,
        {
          pos: new THREE.Vector3(wx - 0.02, wy + 0.12 - i * 0.04, wz + 0.34),
          cast: false,
        }
      );
    }

    // Control panel strip
    this._mesh(
      new THREE.BoxGeometry(0.03, 0.1, 0.22),
      std(0x2a2e34, { roughness: 0.5, metalness: 0.3 }),
      { pos: new THREE.Vector3(wx + 0.3, wy - 0.12, wz - 0.18), cast: false }
    );

    // Power LED
    this._mesh(
      new THREE.SphereGeometry(0.018, 10, 8),
      this.acLedMat,
      { pos: new THREE.Vector3(wx + 0.32, wy - 0.12, wz - 0.18), cast: false }
    );

    // Brand-neutral badge plate
    this._mesh(
      new THREE.BoxGeometry(0.02, 0.04, 0.14),
      std(0x888e98, { metalness: 0.5, roughness: 0.4 }),
      { pos: new THREE.Vector3(wx + 0.3, wy + 0.14, wz + 0.2), cast: false }
    );

    // Condensate drip tray lip under unit
    this._mesh(
      new THREE.BoxGeometry(0.5, 0.03, 0.08),
      std(0x6a7078, { metalness: 0.4, roughness: 0.5 }),
      { pos: new THREE.Vector3(wx + 0.05, wy - 0.24, wz), cast: false }
    );

    // Wall sleeve / frame around AC bay
    const sleeve = std(0x2a2c34, { roughness: 0.65, metalness: 0.15 });
    this._mesh(
      new THREE.BoxGeometry(0.12, 0.48, 0.82),
      sleeve,
      { pos: new THREE.Vector3(-W / 2 + 0.08, wy, wz), cast: false }
    );
  }

  _buildFurniture() {
    const { D } = this.size;
    const wood = std(0x3a2a1e, { roughness: 0.75, metalness: 0.05 });
    const woodDark = std(0x2a1c14, { roughness: 0.8 });
    const fabric = std(0x2c3340, { roughness: 0.95 });

    // Desk against back wall (right side — leave left for plant / AC sightline)
    const deskY = 0.75;
    const deskZ = -D / 2 + 1.1;
    this._mesh(
      new THREE.BoxGeometry(2.2, 0.06, 0.9),
      wood,
      { pos: new THREE.Vector3(0.8, deskY, deskZ) }
    );
    // Legs
    for (const [lx, lz] of [
      [0.8 - 0.95, deskZ - 0.35],
      [0.8 + 0.95, deskZ - 0.35],
      [0.8 - 0.95, deskZ + 0.35],
      [0.8 + 0.95, deskZ + 0.35],
    ]) {
      this._mesh(
        new THREE.BoxGeometry(0.07, deskY, 0.07),
        woodDark,
        { pos: new THREE.Vector3(lx, deskY / 2, lz) }
      );
    }

    // Desk lamp base
    this.deskAnchor.position.set(1.5, deskY + 0.03, deskZ);
    this.group.add(this.deskAnchor);

    const lampBase = this._mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.04, 16),
      std(0x333840, { metalness: 0.4, roughness: 0.4 }),
      { pos: new THREE.Vector3(0, 0.02, 0), cast: true }
    );
    this.deskAnchor.add(lampBase);
    this.group.remove(lampBase);

    const lampPole = new THREE.Mesh(
      this._track(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8)),
      std(0x444850, { metalness: 0.5, roughness: 0.35 })
    );
    lampPole.position.set(0, 0.2, 0);
    lampPole.castShadow = true;
    this.deskAnchor.add(lampPole);

    const lampShade = new THREE.Mesh(
      this._track(new THREE.ConeGeometry(0.12, 0.14, 16, 1, true)),
      std(0x4a4038, { roughness: 0.7, side: THREE.DoubleSide })
    );
    lampShade.position.set(0, 0.38, 0);
    lampShade.castShadow = true;
    this.deskAnchor.add(lampShade);

    // Simple book stack
    this._mesh(
      new THREE.BoxGeometry(0.28, 0.04, 0.2),
      std(0x3d4a6a),
      { pos: new THREE.Vector3(0.3, deskY + 0.05, deskZ + 0.1) }
    );
    this._mesh(
      new THREE.BoxGeometry(0.26, 0.035, 0.18),
      std(0x6a3d3d),
      { pos: new THREE.Vector3(0.3, deskY + 0.09, deskZ + 0.1) }
    );

    // Chair
    const cx = 0.8;
    const cz = deskZ + 0.85;
    this._mesh(
      new THREE.BoxGeometry(0.45, 0.05, 0.45),
      fabric,
      { pos: new THREE.Vector3(cx, 0.45, cz) }
    );
    this._mesh(
      new THREE.BoxGeometry(0.45, 0.5, 0.05),
      fabric,
      { pos: new THREE.Vector3(cx, 0.72, cz - 0.2) }
    );
    for (const [lx, lz] of [
      [cx - 0.18, cz - 0.18],
      [cx + 0.18, cz - 0.18],
      [cx - 0.18, cz + 0.18],
      [cx + 0.18, cz + 0.18],
    ]) {
      this._mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8),
        woodDark,
        { pos: new THREE.Vector3(lx, 0.225, lz) }
      );
    }

    // Small rug
    this._mesh(
      new THREE.BoxGeometry(2.4, 0.02, 1.6),
      std(0x2a2430, { roughness: 1 }),
      { pos: new THREE.Vector3(0.3, 0.01, 0.2), cast: false }
    );

    // Floor plant pot (near AC / left back)
    this._mesh(
      new THREE.CylinderGeometry(0.18, 0.14, 0.28, 12),
      std(0x3a2e28),
      { pos: new THREE.Vector3(-2.6, 0.14, -2.2) }
    );
    this._mesh(
      new THREE.SphereGeometry(0.35, 10, 8),
      std(0x1a3020, { roughness: 0.95 }),
      { pos: new THREE.Vector3(-2.6, 0.55, -2.2) }
    );
  }

  /**
   * Freestanding fridge against right wall (away from desk).
   */
  _buildFridge() {
    const { W } = this.size;
    const fx = W / 2 - 0.38;
    const fz = 0.85;
    const bodyH = 1.75;
    const bodyY = bodyH / 2;

    const bodyMat = std(0xc8ccd2, { roughness: 0.45, metalness: 0.35 });
    const doorMat = std(0xd0d4da, { roughness: 0.4, metalness: 0.4 });
    const darkTrim = std(0x2a2e34, { roughness: 0.6, metalness: 0.25 });
    const handleMat = std(0x888e98, { roughness: 0.35, metalness: 0.7 });

    this.fridgeLedMat = new THREE.MeshStandardMaterial({
      color: 0x1a1c20,
      roughness: 0.4,
      metalness: 0.1,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    this._track(this.fridgeLedMat);

    // Body
    this._mesh(
      new THREE.BoxGeometry(0.62, bodyH, 0.68),
      bodyMat,
      { pos: new THREE.Vector3(fx, bodyY, fz) }
    );

    // Door (slight gap from body)
    this._mesh(
      new THREE.BoxGeometry(0.05, bodyH - 0.06, 0.64),
      doorMat,
      { pos: new THREE.Vector3(fx - 0.34, bodyY, fz) }
    );

    // Door seam (freezer / fridge split)
    this._mesh(
      new THREE.BoxGeometry(0.052, 0.02, 0.62),
      darkTrim,
      { pos: new THREE.Vector3(fx - 0.345, 1.15, fz), cast: false }
    );

    // Vertical handle
    this._mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.55, 10),
      handleMat,
      {
        pos: new THREE.Vector3(fx - 0.38, 0.85, fz - 0.22),
        rot: { x: 0, y: 0, z: 0 },
      }
    );
    // Handle brackets
    this._mesh(
      new THREE.BoxGeometry(0.04, 0.03, 0.03),
      handleMat,
      { pos: new THREE.Vector3(fx - 0.36, 1.1, fz - 0.22), cast: false }
    );
    this._mesh(
      new THREE.BoxGeometry(0.04, 0.03, 0.03),
      handleMat,
      { pos: new THREE.Vector3(fx - 0.36, 0.6, fz - 0.22), cast: false }
    );

    // Top freezer badge strip
    this._mesh(
      new THREE.BoxGeometry(0.04, 0.08, 0.2),
      darkTrim,
      { pos: new THREE.Vector3(fx - 0.35, 1.5, fz + 0.15), cast: false }
    );

    // Status LED on door
    this._mesh(
      new THREE.SphereGeometry(0.015, 10, 8),
      this.fridgeLedMat,
      { pos: new THREE.Vector3(fx - 0.37, 1.5, fz + 0.15), cast: false }
    );

    // Kick plate
    this._mesh(
      new THREE.BoxGeometry(0.58, 0.08, 0.64),
      darkTrim,
      { pos: new THREE.Vector3(fx, 0.04, fz), cast: false }
    );

    // Feet
    for (const [ox, oz] of [
      [-0.22, -0.24],
      [0.22, -0.24],
      [-0.22, 0.24],
      [0.22, 0.24],
    ]) {
      this._mesh(
        new THREE.CylinderGeometry(0.03, 0.035, 0.04, 8),
        darkTrim,
        { pos: new THREE.Vector3(fx + ox, 0.02, fz + oz), cast: false }
      );
    }
  }

  _buildFixture() {
    const { H } = this.size;
    this.ceilingAnchor.position.set(0, H - 0.05, -0.3);
    this.group.add(this.ceilingAnchor);

    const metal = std(0x555860, { metalness: 0.65, roughness: 0.35 });

    // Mount plate
    const plate = new THREE.Mesh(
      this._track(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 24)),
      metal
    );
    plate.position.y = 0;
    this.ceilingAnchor.add(plate);

    // Stem
    const stem = new THREE.Mesh(
      this._track(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8)),
      metal
    );
    stem.position.y = -0.18;
    this.ceilingAnchor.add(stem);

    // Shade (open downward)
    const shade = new THREE.Mesh(
      this._track(new THREE.CylinderGeometry(0.35, 0.45, 0.22, 24, 1, true)),
      new THREE.MeshStandardMaterial({
        color: 0x3a3c44,
        roughness: 0.65,
        metalness: 0.15,
        side: THREE.DoubleSide,
      })
    );
    this._track(shade.material);
    shade.position.y = -0.42;
    shade.castShadow = true;
    this.ceilingAnchor.add(shade);

    // Bulb (emissive when on)
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0x222228,
      roughness: 0.35,
      metalness: 0.1,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    this._track(bulbMat);
    this.bulbMesh = new THREE.Mesh(
      this._track(new THREE.SphereGeometry(0.08, 20, 16)),
      bulbMat
    );
    this.bulbMesh.position.y = -0.48;
    this.bulbMesh.castShadow = false;
    this.ceilingAnchor.add(this.bulbMesh);

    // Socket
    const socket = new THREE.Mesh(
      this._track(new THREE.CylinderGeometry(0.035, 0.04, 0.06, 12)),
      metal
    );
    socket.position.y = -0.4;
    this.ceilingAnchor.add(socket);
  }


  /**
   * Compact stove — moved next to fridge when「遠離熱源」is off.
   */
  _buildStove() {
    const { W } = this.size;
    this.stoveGroup = new THREE.Group();
    this.stoveGroup.name = 'stove';
    this.group.add(this.stoveGroup);

    const body = std(0x2a2e34, { roughness: 0.55, metalness: 0.35 });
    const top = std(0x1a1c20, { roughness: 0.4, metalness: 0.5 });
    const burner = std(0x111214, { roughness: 0.7, metalness: 0.4 });
    const glow = new THREE.MeshStandardMaterial({
      color: 0x331110,
      roughness: 0.6,
      metalness: 0.1,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    this._track(glow);
    this.stoveGlowMat = glow;

    const bodyMesh = new THREE.Mesh(
      this._track(new THREE.BoxGeometry(0.55, 0.85, 0.5)),
      body
    );
    bodyMesh.position.set(0, 0.425, 0);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.stoveGroup.add(bodyMesh);

    const topMesh = new THREE.Mesh(
      this._track(new THREE.BoxGeometry(0.58, 0.04, 0.52)),
      top
    );
    topMesh.position.set(0, 0.87, 0);
    topMesh.castShadow = true;
    this.stoveGroup.add(topMesh);

    for (const [ox, oz] of [
      [-0.14, -0.1],
      [0.14, -0.1],
      [-0.14, 0.12],
      [0.14, 0.12],
    ]) {
      const b = new THREE.Mesh(
        this._track(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16)),
        burner
      );
      b.position.set(ox, 0.9, oz);
      this.stoveGroup.add(b);

      const ring = new THREE.Mesh(
        this._track(new THREE.TorusGeometry(0.055, 0.008, 8, 16)),
        glow
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(ox, 0.915, oz);
      this.stoveGroup.add(ring);
    }

    // Default: far from fridge (left back corner near plant)
    this._stoveFar = new THREE.Vector3(-2.2, 0, -2.5);
    this._stoveNear = new THREE.Vector3(W / 2 - 0.95, 0, 0.85);
    this.stoveGroup.position.copy(this._stoveFar);
  }

  /**
   * Pedestal / floor circulation fan.
   */
  _buildCirculationFan() {
    const { W } = this.size;
    this.fanRoot = new THREE.Group();
    this.fanRoot.name = 'circulationFan';
    this.group.add(this.fanRoot);

    const metal = std(0x5a6068, { roughness: 0.4, metalness: 0.55 });
    const dark = std(0x2a2e34, { roughness: 0.55, metalness: 0.35 });
    const plastic = std(0xd8dce2, { roughness: 0.5, metalness: 0.15 });

    this.fanLedMat = new THREE.MeshStandardMaterial({
      color: 0x1a1c20,
      roughness: 0.4,
      metalness: 0.1,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    this._track(this.fanLedMat);

    // Base
    const base = new THREE.Mesh(
      this._track(new THREE.CylinderGeometry(0.18, 0.22, 0.04, 20)),
      dark
    );
    base.position.y = 0.02;
    base.castShadow = true;
    base.receiveShadow = true;
    this.fanRoot.add(base);

    // Pole
    const pole = new THREE.Mesh(
      this._track(new THREE.CylinderGeometry(0.025, 0.03, 0.55, 10)),
      metal
    );
    pole.position.y = 0.3;
    pole.castShadow = true;
    this.fanRoot.add(pole);

    // Head pivot (tilt for 仰角)
    this.fanHead = new THREE.Group();
    this.fanHead.position.set(0, 0.62, 0);
    this.fanRoot.add(this.fanHead);

    // Motor hub
    const hub = new THREE.Mesh(
      this._track(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 16)),
      dark
    );
    hub.rotation.x = Math.PI / 2;
    hub.castShadow = true;
    this.fanHead.add(hub);

    // Guard ring
    const guard = new THREE.Mesh(
      this._track(new THREE.TorusGeometry(0.22, 0.012, 8, 32)),
      metal
    );
    guard.position.z = 0.06;
    this.fanHead.add(guard);

    // Outer guard disc (wire look via flat ring)
    const guardDisc = new THREE.Mesh(
      this._track(new THREE.RingGeometry(0.08, 0.21, 24)),
      new THREE.MeshStandardMaterial({
        color: 0x888e98,
        roughness: 0.45,
        metalness: 0.4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35,
      })
    );
    this._track(guardDisc.material);
    guardDisc.position.z = 0.06;
    this.fanHead.add(guardDisc);

    // Blades
    this.fanBladeGroup = new THREE.Group();
    this.fanBladeGroup.position.z = 0.08;
    this.fanHead.add(this.fanBladeGroup);

    const bladeMat = plastic;
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(
        this._track(new THREE.BoxGeometry(0.08, 0.2, 0.012)),
        bladeMat
      );
      blade.position.y = 0.1;
      blade.castShadow = true;
      const pivot = new THREE.Group();
      pivot.rotation.z = (i * Math.PI * 2) / 3;
      pivot.add(blade);
      this.fanBladeGroup.add(pivot);
    }

    // Center cap
    const cap = new THREE.Mesh(
      this._track(new THREE.SphereGeometry(0.035, 12, 10)),
      metal
    );
    cap.position.z = 0.1;
    this.fanHead.add(cap);

    // Power LED on base
    const led = new THREE.Mesh(
      this._track(new THREE.SphereGeometry(0.015, 8, 6)),
      this.fanLedMat
    );
    led.position.set(0.12, 0.05, 0.1);
    this.fanRoot.add(led);

    // Correct: under AC outlet, angled up toward room center
    this._fanCorrectPos = new THREE.Vector3(-W / 2 + 0.95, 0, -0.35);
    this._fanCorrectRotY = Math.PI / 2 - 0.35; // face toward room center
    this._fanCorrectTilt = -0.55; // 仰角 (head tip up)

    // Wrong: against front-right wall, blowing into wall
    this._fanWrongPos = new THREE.Vector3(W / 2 - 0.7, 0, 2.4);
    this._fanWrongRotY = -Math.PI / 2;
    this._fanWrongTilt = 0.15;

    this.setFanPlacement('correct');
  }

  /**
   * Soft translucent airflow arcs — shown when AC+fan+correct.
   */
  _buildAirflowHints() {
    const { W } = this.size;
    this.airflowGroup = new THREE.Group();
    this.airflowGroup.name = 'airflow';
    this.airflowGroup.visible = false;
    this.group.add(this.airflowGroup);

    const mat = new THREE.MeshBasicMaterial({
      color: 0x66ccff,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    this._track(mat);

    for (let i = 0; i < 5; i++) {
      const arrow = new THREE.Mesh(
        this._track(new THREE.ConeGeometry(0.04, 0.14, 8)),
        mat.clone()
      );
      this._track(arrow.material);
      const t = i / 4;
      arrow.position.set(
        -W / 2 + 1.1 + t * 1.8,
        0.9 + t * 0.55,
        -0.2 + t * 0.9
      );
      arrow.rotation.z = -0.9;
      arrow.rotation.y = 0.4;
      arrow.userData.baseY = arrow.position.y;
      this.airflowGroup.add(arrow);
    }
  }

  /**
   * @param {'correct' | 'wrong'} placement
   */
  setFanPlacement(placement) {
    if (!this.fanRoot || !this.fanHead) return;
    this._fanPlacement = placement;
    if (placement === 'correct') {
      this.fanRoot.position.copy(this._fanCorrectPos);
      this.fanRoot.rotation.y = this._fanCorrectRotY;
      this.fanHead.rotation.x = this._fanCorrectTilt;
    } else {
      this.fanRoot.position.copy(this._fanWrongPos);
      this.fanRoot.rotation.y = this._fanWrongRotY;
      this.fanHead.rotation.x = this._fanWrongTilt;
    }
  }

  /**
   * @param {boolean} near — true when fridge is next to heat source
   */
  setStoveNearFridge(near) {
    if (!this.stoveGroup) return;
    this.stoveGroup.position.copy(near ? this._stoveNear : this._stoveFar);
    if (this.stoveGlowMat) {
      if (near) {
        this.stoveGlowMat.emissive.setHex(0xff4422);
        this.stoveGlowMat.emissiveIntensity = 0.85;
        this.stoveGlowMat.color.setHex(0x552210);
      } else {
        this.stoveGlowMat.emissive.setHex(0x000000);
        this.stoveGlowMat.emissiveIntensity = 0;
        this.stoveGlowMat.color.setHex(0x331110);
      }
    }
  }

  /**
   * Small cubes on fridge top hinting fill level.
   * @param {'empty' | 'seventy' | 'stuffed' | 'off'} fill
   */
  setFridgeFillVisual(fill) {
    if (!this.fridgeFillGroup) {
      const { W } = this.size;
      this.fridgeFillGroup = new THREE.Group();
      this.fridgeFillGroup.name = 'fridgeFill';
      this.fridgeFillGroup.position.set(W / 2 - 0.38, 1.78, 0.85);
      this.group.add(this.fridgeFillGroup);

      this._fillMats = [];
      for (let i = 0; i < 5; i++) {
        const mat = new THREE.MeshStandardMaterial({
          color: 0x4a6a8a,
          roughness: 0.7,
          metalness: 0.1,
          transparent: true,
          opacity: 0.85,
        });
        this._track(mat);
        this._fillMats.push(mat);
        const box = new THREE.Mesh(
          this._track(new THREE.BoxGeometry(0.1, 0.08, 0.1)),
          mat
        );
        box.position.set((i % 3) * 0.12 - 0.12, Math.floor(i / 3) * 0.1, (i % 2) * 0.08 - 0.04);
        box.castShadow = true;
        this.fridgeFillGroup.add(box);
      }
    }

    const n =
      fill === 'off' || fill === 'empty'
        ? 0
        : fill === 'seventy'
          ? 3
          : 5;
    this.fridgeFillGroup.children.forEach((c, i) => {
      c.visible = i < n;
      if (this._fillMats[i]) {
        if (fill === 'stuffed') {
          this._fillMats[i].color.setHex(0xc45a3a);
        } else {
          this._fillMats[i].color.setHex(0x4a8a6a);
        }
      }
    });
    // 「上方不可置物」— stuffed stacks on top as a gentle teaching cue
    this.fridgeFillGroup.visible = fill !== 'off';
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
        else obj.material?.dispose?.();
      }
    });
    for (const d of this._disposables) {
      d.dispose?.();
    }
    this._disposables.length = 0;
  }
}
