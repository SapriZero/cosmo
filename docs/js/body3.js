// --- Vettori 3D: utility functions (immutable style) ---
function vec3(x = 0, y = 0, z = 0) {
    return [x, y, z];
}

function vec3Add(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vec3Sub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vec3Scale(v, s) {
    return [v[0] * s, v[1] * s, v[2] * s];
}

function vec3Dot(a, b) {
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}

function vec3Norm(v) {
    return Math.sqrt(vec3Dot(v, v));
}

function vec3Copy(v) {
    return [v[0], v[1], v[2]];
}

// --- Body: immutable object ---
class Body {
    constructor(m, r, v) {
        this.m = m;
        this.r = vec3Copy(r); // ensure immutability
        this.v = vec3Copy(v);
    }
}

// --- State = array of Body (treated as immutable) ---

// --- State extractors ---
function masses(state) {
    return state.map(b => b.m);
}

function positions(state) {
    return state.map(b => vec3Copy(b.r));
}

function velocities(state) {
    return state.map(b => vec3Copy(b.v));
}

// --- Accelerations (fully vectorized equivalent) ---
function accelerations(state, G = 1.0, eps = 1e-12) {
    const pos = positions(state); // N x 3
    const m = masses(state);      // N
    const N = state.length;
    const acc = Array(N).fill().map(() => vec3(0, 0, 0));

    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            if (i === j) continue;
            const dx = vec3Sub(pos[j], pos[i]); // r_j - r_i
            const distSq = vec3Dot(dx, dx);
            const dist = Math.sqrt(distSq);
            const distCubed = dist * distSq + eps;
            const factor = G * m[j] / distCubed;
            acc[i] = vec3Add(acc[i], vec3Scale(dx, factor));
        }
    }
    return acc;
}

// --- Energy ---
function kineticEnergy(state) {
    const v = velocities(state);
    const m = masses(state);
    let ke = 0;
    for (let i = 0; i < state.length; i++) {
        ke += 0.5 * m[i] * vec3Dot(v[i], v[i]);
    }
    return ke;
}

function potentialEnergy(state, G = 1.0, eps = 1e-12) {
    const pos = positions(state);
    const m = masses(state);
    const N = state.length;
    let pe = 0;
    for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
            const dx = vec3Sub(pos[j], pos[i]);
            const dist = vec3Norm(dx) + eps;
            pe -= G * m[i] * m[j] / dist;
        }
    }
    return pe;
}

function totalEnergy(state) {
    return kineticEnergy(state) + potentialEnergy(state);
}

// --- Pure relations: State → State ---
function addVelocity(state, dv) {
    return state.map((b, i) => new Body(b.m, b.r, vec3Add(b.v, dv[i])));
}

function addPosition(state, dx) {
    return state.map((b, i) => new Body(b.m, vec3Add(b.r, dx[i]), b.v));
}

function halfStepVelocityRelation(state, dt) {
    const a = accelerations(state);
    const dv = a.map(ai => vec3Scale(ai, dt / 2));
    return addVelocity(state, dv);
}

function fullStepPositionRelation(state, dt) {
    const v = velocities(state);
    const dx = v.map(vi => vec3Scale(vi, dt));
    return addPosition(state, dx);
}

// --- Leapfrog composition ---
function compose(...funcs) {
    return (state, dt) => funcs.reduce((s, f) => f(s, dt), state);
}

const leapfrogStep = compose(
    halfStepVelocityRelation,
    fullStepPositionRelation,
    halfStepVelocityRelation
);

// --- Validation test (Lagrangian equilateral) ---
function testEnergyConservation() {
    console.log("🧪 Running energy conservation test (Lagrangian equilateral configuration)...");

    const a = 1.0;
    const r1 = vec3( a,  0.0, 0.0);
    const r2 = vec3(-a/2,  Math.sqrt(3)*a/2, 0.0);
    const r3 = vec3(-a/2, -Math.sqrt(3)*a/2, 0.0);

    // Tangential velocities for rigid rotation (|v| = 1.0)
    const v1 = vec3( 0.0,  1.0, 0.0);
    const v2 = vec3(-Math.sqrt(3)/2, -0.5, 0.0);
    const v3 = vec3( Math.sqrt(3)/2, -0.5, 0.0);

    let state = [
        new Body(1.0, r1, v1),
        new Body(1.0, r2, v2),
        new Body(1.0, r3, v3)
    ];

    const dt = 0.001;
    const steps = 5000;
    const E0 = totalEnergy(state);

    for (let i = 0; i < steps; i++) {
        state = leapfrogStep(state, dt);
    }

    const E1 = totalEnergy(state);
    const relError = Math.abs(E1 - E0) / (Math.abs(E0) + 1e-15);

    console.log(`✅ Initial energy: ${E0.toFixed(8)}`);
    console.log(`✅ Final energy:   ${E1.toFixed(8)}`);
    console.log(`📊 Relative error: ${relError.toExponential(2)}`);

    if (relError < 1e-4) {
        console.log("🟢 Test passed: energy is well conserved!");
        return true;
    } else {
        console.log("🔴 Warning: high energy error.");
        return false;
    }
}

// --- Run test (uncomment to execute in browser console or Node.js) ---
// testEnergyConservation();
