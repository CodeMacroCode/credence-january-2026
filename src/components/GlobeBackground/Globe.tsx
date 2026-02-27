"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import ThreeGlobe from "three-globe";
import validPoints from "./validPoints.json";

export default function Globe() {
    const DOT_COUNT = 200000;
    const [isDragging, setIsDragging] = useState(false);
    const [pointsData, setPointsData] = useState<any[]>([]);
    const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
    const lightRef = useRef<THREE.DirectionalLight>(null);
    const { camera } = useThree();

    // Generate lat/lng from validPoints
    useEffect(() => {
        const points = [];

        for (let i = 0; i < validPoints.length; i++) {
            const index = validPoints[i];
            const phi = Math.acos(-1 + (2 * index) / DOT_COUNT);
            const theta = Math.sqrt(DOT_COUNT * Math.PI) * phi;

            const lat = 90 - (phi * 180) / Math.PI;
            let lng = (theta * 180) / Math.PI;

            lng = lng % 360;
            if (lng > 180) lng -= 360;
            else if (lng < -180) lng += 360;

            points.push({ lat, lng });
        }

        setPointsData(points);
    }, []);

    // Arc data connecting major cities — each with unique color and staggered start
    const arcsData = [
        { startLat: 21.1458, startLng: 79.0882, endLat: 40.7128, endLng: -74.006, gap: 0.2, color: ["#4fc3f7", "#81d4fa"] },      // Nagpur → NYC
        { startLat: 35.6762, startLng: 139.6503, endLat: -33.8688, endLng: 151.2093, gap: 1.5, color: ["#ce93d8", "#ba68c8"] },    // Tokyo → Sydney
        { startLat: -23.5505, startLng: -46.6333, endLat: 25.2048, endLng: 55.2708, gap: 0.7, color: ["#4dd0e1", "#00bcd4"] },     // São Paulo → Dubai
        { startLat: 34.0522, startLng: -118.2437, endLat: -33.9249, endLng: 18.4241, gap: 0.0, color: ["#80cbc4", "#4db6ac"] },    // LA → Cape Town
        { startLat: 48.8566, startLng: 2.3522, endLat: 55.7558, endLng: 37.6173, gap: 2.5, color: ["#b39ddb", "#9575cd"] },        // Paris → Moscow
        { startLat: 39.9042, startLng: 116.4074, endLat: -1.2921, endLng: 36.8219, gap: 1.0, color: ["#aed581", "#9ccc65"] },      // Beijing → Nairobi
        { startLat: 41.0082, startLng: 28.9784, endLat: 13.7563, endLng: 100.5018, gap: 1.8, color: ["#90caf9", "#64b5f6"] },      // Istanbul → Bangkok
        { startLat: 43.6532, startLng: -79.3832, endLat: -12.0464, endLng: -77.0428, gap: 0.4, color: ["#f48fb1", "#f06292"] },    // Toronto → Lima
        { startLat: 60.1699, startLng: 24.9384, endLat: -6.2088, endLng: 106.8456, gap: 2.3, color: ["#80deea", "#4dd0e1"] },      // Helsinki → Jakarta
        { startLat: 30.0444, startLng: 31.2357, endLat: 38.7223, endLng: -9.1393, gap: 1.3, color: ["#ffcc80", "#ffb74d"] },       // Cairo → Lisbon
        { startLat: 37.5665, startLng: 126.978, endLat: -33.4489, endLng: -70.6693, gap: 0.9, color: ["#a5d6a7", "#81c784"] },     // Seoul → Santiago
    ];

    // Arc animation constants
    const DASH_LENGTH = 2;
    const DASH_GAP = 2;
    const ANIMATE_TIME = 1000; // ms
    const PATTERN_LENGTH = DASH_LENGTH + DASH_GAP;

    // Create globe
    const [globe] = useState(() => {
        const g = new ThreeGlobe();
        const globeMaterial = g.globeMaterial() as THREE.MeshPhongMaterial;

        globeMaterial.color.set("#0d2e4e");
        globeMaterial.transparent = true;
        globeMaterial.opacity = 0.8;
        globeMaterial.shininess = 0;
        globeMaterial.specular = new THREE.Color("#000000");

        g.showGlobe(true);

        // Add arcs — staggered starts + cooldown gap between cycles
        g.arcsData(arcsData)
            .arcColor((d: any) => d.color)
            .arcStroke(0.1)
            .arcDashLength(DASH_LENGTH)
            .arcDashGap(DASH_GAP)
            .arcDashInitialGap((d: any) => d.gap)
            .arcDashAnimateTime(ANIMATE_TIME)
            .arcAltitudeAutoScale(0.4);

        // Ring styling (data will be set dynamically)
        g.ringColor(() => (t: number) => `rgba(255, 200, 50, ${1 - t})`)
            .ringMaxRadius(3)
            .ringPropagationSpeed(2)
            .ringRepeatPeriod(800);

        // HTML dot styling (data will be set dynamically)
        g.htmlElement((d: any) => {
            const wrapper = document.createElement("div");
            wrapper.style.position = "relative";
            wrapper.style.width = "16px";
            wrapper.style.height = "16px";
            wrapper.style.pointerEvents = "none";

            // Outer ring
            const ring = document.createElement("div");
            ring.style.position = "absolute";
            ring.style.width = "16px";
            ring.style.height = "16px";
            ring.style.borderRadius = "50%";
            ring.style.border = `2px solid ${d.color}`;
            ring.style.boxSizing = "border-box";
            ring.style.top = "0";
            ring.style.left = "0";
            wrapper.appendChild(ring);

            // Inner dot
            const dot = document.createElement("div");
            dot.style.position = "absolute";
            dot.style.width = "8px";
            dot.style.height = "8px";
            dot.style.borderRadius = "50%";
            dot.style.backgroundColor = d.color;
            dot.style.boxShadow = `0 0 8px ${d.color}`;
            dot.style.top = "50%";
            dot.style.left = "50%";
            dot.style.transform = "translate(-50%, -50%)";
            wrapper.appendChild(dot);

            return wrapper;
        });

        return g;
    });

    // Check if an arc's dash is currently overlapping the arc path
    const isArcVisible = (arc: any, timeMs: number) => {
        const speed = PATTERN_LENGTH / ANIMATE_TIME; // units per ms
        const dashPos = (arc.gap + timeMs * speed) % PATTERN_LENGTH;
        // The dash leading edge is at dashPos, trailing edge at dashPos - DASH_LENGTH
        // Arc occupies [0, 1] in normalized space
        const leadingEdge = dashPos;
        const trailingEdge = dashPos - DASH_LENGTH;
        // Visible if dash overlaps [0, 1]
        return leadingEdge > 0 && trailingEdge < 1;
    };

    // Dynamically sync rings and dots to arc visibility
    const startTimeRef = useRef(Date.now());
    useEffect(() => {
        const update = () => {
            const elapsed = Date.now() - startTimeRef.current;

            const visibleRings: any[] = [];
            const visibleDots: any[] = [];

            arcsData.forEach((arc) => {
                if (isArcVisible(arc, elapsed)) {
                    // Start point
                    visibleRings.push({ lat: arc.startLat, lng: arc.startLng });
                    visibleDots.push({ lat: arc.startLat, lng: arc.startLng, color: arc.color[0] });
                    // End point
                    visibleRings.push({ lat: arc.endLat, lng: arc.endLng });
                    visibleDots.push({ lat: arc.endLat, lng: arc.endLng, color: arc.color[1] });
                }
            });

            globe.ringsData(visibleRings);
            globe.htmlElementsData(visibleDots);
        };

        update();
        const interval = setInterval(update, 100);
        return () => clearInterval(interval);
    }, [globe]);

    // Create Instanced Pixelated Dots
    useEffect(() => {
        if (!pointsData.length) return;

        // 🔥 Highly pixelated low-poly dot
        const dotGeometry = new THREE.CircleGeometry(0.18, 5); // LOW SEGMENTS = pixelated
        const dotMaterial = new THREE.MeshBasicMaterial({
            color: "#7fb3e6",
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
        });

        const mesh = new THREE.InstancedMesh(
            dotGeometry,
            dotMaterial,
            pointsData.length
        );

        const dummy = new THREE.Object3D();

        pointsData.forEach((d, i) => {
            const { x, y, z } = globe.getCoords(d.lat, d.lng, 0);

            dummy.position.set(x, y, z);
            dummy.lookAt(0, 0, 0);

            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        });

        mesh.instanceMatrix.needsUpdate = true;

        instancedMeshRef.current = mesh;
        globe.add(mesh);

    }, [pointsData, globe]);

    useFrame(({ clock }) => {
        // Keep the light fixed to the top-right of the viewer
        if (lightRef.current) {
            const forward = new THREE.Vector3();
            camera.getWorldDirection(forward);
            const right = forward.clone().cross(camera.up).normalize();
            const up = camera.up.clone().normalize();
            // Combine right + up for a top-right position
            const lightDir = right.multiplyScalar(15).add(up.multiplyScalar(10));
            lightRef.current.position.copy(lightDir);
        }

        const mesh = instancedMeshRef.current;
        if (!mesh || !pointsData.length) return;

        const time = clock.getElapsedTime();
        const dummy = new THREE.Object3D();

        for (let i = 0; i < mesh.count; i++) {
            const { lat, lng } = pointsData[i];
            const base = globe.getCoords(lat, lng, 0);

            let offset = 0;

            // Stable random seed per dot
            const seed = Math.abs((Math.sin(i * 91.345) * 43758.5453) % 1000);

            // Continuous "opacity" twinkling (scaling mimics opacity for fine dots)
            const twinkle = 0.3 + Math.abs(Math.sin(time * 2.5 + seed)) * 0.7;

            // Use a persistent array to smoothly lerp in and out of the drag state
            if (!mesh.userData.dragProgress) {
                mesh.userData.dragProgress = new Float32Array(mesh.count);
            }

            // Transition speed for popping out (slower) vs going back in (faster)
            const popOutSpeed = 5;   // Takes ~0.5s to fully pop out
            const dropInSpeed = 25;   // Takes ~0.16s to drop back in (much faster)
            const delta = 0.016; // Approx frame time

            if (isDragging) {
                mesh.userData.dragProgress[i] = Math.min(1.0, mesh.userData.dragProgress[i] + popOutSpeed * delta);
            } else {
                mesh.userData.dragProgress[i] = Math.max(0.0, mesh.userData.dragProgress[i] - dropInSpeed * delta);
            }

            if (mesh.userData.dragProgress[i] > 0) {
                // All dots go up and down continuously with a longer cycle
                const speed = 0.8; // Lower value = longer duration

                // Sine wave from -1 to 1, shifted to 0 to 2, scaled to 0 to 5 height
                const targetOffset = (Math.sin(time * speed + seed) + 1) * 2.5;

                // Multiply target offset by drag progress so it transitions smoothly in and out
                offset = targetOffset * mesh.userData.dragProgress[i];
            }

            dummy.position.set(
                base.x + (base.x / 100) * offset,
                base.y + (base.y / 100) * offset,
                base.z + (base.z / 100) * offset
            );

            dummy.scale.set(twinkle, twinkle, twinkle);
            dummy.lookAt(0, 0, 0);
            dummy.rotateZ(time * 3 + seed); // spin the dots
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }

        mesh.instanceMatrix.needsUpdate = true;

        mesh.instanceMatrix.needsUpdate = true;
    });

    return (
        <>
            {/* Light fixed to the right side of the screen, positioned via useFrame */}
            <directionalLight ref={lightRef} intensity={5} />

            <group>
                <OrbitControls
                    enableZoom
                    minDistance={250}
                    maxDistance={400}
                    zoomSpeed={0.6}
                    autoRotate={!isDragging}
                    autoRotateSpeed={1}
                    enableDamping={false}   // 🔥 disable smoothing
                    dampingFactor={0}       // no inertia
                    rotateSpeed={2}       // optional: reduce sensitivity
                    onStart={() => {
                        document.body.style.cursor = "grabbing";
                        setIsDragging(true);
                    }}
                    onEnd={() => {
                        document.body.style.cursor = "grab";
                        setIsDragging(false);
                    }}
                />
                {/* The soft ambient light */}
                <ambientLight intensity={0.6} />

                <group rotation={[0, -Math.PI / 1.05 + Math.PI / 5, 0]}> {/* Roughly centers on India */}
                    <primitive object={globe} />
                </group>
            </group>
        </>
    );
}