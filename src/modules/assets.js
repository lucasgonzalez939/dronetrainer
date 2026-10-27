/**
 * assets.js – Shared asset cache (geometries & materials) and safe disposal.
 * Prevents GPU shader re-compilation spikes and memory leaks during level transitions.
 */

import * as THREE from './three.js';

// Cache maps
const materials = new Map();
const geometries = new Map();

/**
 * Returns a cached material or creates and caches it.
 * Marks it as shared so disposeObject won't destroy it.
 */
export function getSharedMaterial(key, factory) {
  if (materials.has(key)) {
    return materials.get(key);
  }
  const mat = factory();
  mat.userData = mat.userData || {};
  mat.userData.isSharedAsset = true;
  materials.set(key, mat);
  return mat;
}

/**
 * Returns a cached geometry or creates and caches it.
 * Marks it as shared so disposeObject won't destroy it.
 */
export function getSharedGeometry(key, factory) {
  if (geometries.has(key)) {
    return geometries.get(key);
  }
  const geo = factory();
  geo.userData = geo.userData || {};
  geo.userData.isSharedAsset = true;
  geometries.set(key, geo);
  return geo;
}

/**
 * Standard gate materials (using Lambert for high performance on mobile)
 */
export function getGateMaterial(colorHex = 0xff9800, emissiveHex = 0x7a3800) {
  const key = `gate_${colorHex}_${emissiveHex}`;
  return getSharedMaterial(key, () => new THREE.MeshLambertMaterial({
    color: colorHex,
    emissive: emissiveHex
  }));
}

export function getGateLegMaterial() {
  return getSharedMaterial('gate_leg_mat', () => new THREE.MeshLambertMaterial({
    color: 0x37474f
  }));
}

/**
 * Soft checkpoint materials
 */
export function getSoftCheckpointMaterial() {
  return getSharedMaterial('soft_cp_ring', () => new THREE.MeshBasicMaterial({
    color: 0x80deea,
    transparent: true,
    opacity: 0.35
  }));
}

export function getSoftCheckpointActiveMaterial() {
  return getSharedMaterial('soft_cp_active', () => new THREE.MeshBasicMaterial({
    color: 0x26c6da,
    transparent: true,
    opacity: 0.6
  }));
}

/**
 * Landing pad materials
 */
export function getLandingPadMaterial(colorHex = 0xffeb3b) {
  return getSharedMaterial(`landing_pad_${colorHex}`, () => new THREE.MeshLambertMaterial({
    color: colorHex,
    emissive: new THREE.Color(colorHex).multiplyScalar(0.2)
  }));
}

export function getLandingPadHMaterial() {
  return getSharedMaterial('landing_pad_h', () => new THREE.MeshBasicMaterial({
    color: 0xffffff
  }));
}

/**
 * Recursively disposes an object's geometries and materials unless marked isSharedAsset.
 */
export function disposeObject(obj) {
  if (!obj) return;

  obj.traverse(child => {
    if (child.isMesh || child.isLine || child.isPoints) {
      if (child.geometry && (!child.geometry.userData || !child.geometry.userData.isSharedAsset)) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => {
            if (m && (!m.userData || !m.userData.isSharedAsset)) m.dispose();
          });
        } else if (!child.material.userData || !child.material.userData.isSharedAsset) {
          child.material.dispose();
        }
      }
    }
  });
}
