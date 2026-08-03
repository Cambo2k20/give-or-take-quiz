import { memo, useEffect, useRef } from "react";
import {
  MASCOT_LIMITS,
  MASCOT_MOTION,
  MASCOT_REACTION_FACE,
  MASCOT_REACTION_MS,
  isPrecisionMovement,
  rapidDragReach,
  resolveGripSide,
  resolveRapidDrag,
  smoothThumbVelocity,
  type MascotExpression,
  type MascotGripSide,
  type MascotPose,
  type MascotReaction,
  type MascotSnapshot,
} from "./mascotState";
import { playMascotSound } from "./mascotSounds";
import "./mascot-animations.css";

/**
 * The mascot that holds the warm-up slider.
 *
 * Render it as the first child of the existing `.slider-wrap`. It reads the real
 * range input beside it — value, pointer, focus and key events — so the slider's
 * logic, scoring and question behaviour are untouched: this component only
 * watches. Everything animates on refs inside one requestAnimationFrame loop,
 * so a drag causes no React renders at all.
 *
 * Both hands are planted rather than drawn: one rests on the bar, one grips the
 * knob, and each arm is redrawn every frame between a shoulder that rides the
 * body and a hand that stays where it was put. Nothing can drift loose from the
 * body, because no limb has a fixed pose to drift out of.
 */

/** Artwork geometry, in SVG units. */
const ART = {
  width: 150,
  height: 168,
  /** Rest position of the gripping hand; the body is placed so this meets the knob. */
  handX: 128,
  handY: 74,
  /** Distance from the resting hand down to the rail centre line. */
  handLift: 15,
  /** Sideways offset of the hand from the knob centre, so it grips off-centre. */
  handNudge: -4,
  /** The rail's centre line, which is `handY + handLift` by construction. */
  railY: 89,
  neckX: 62,
  neckY: 78,
  pivotX: 62,
  pivotY: 112,
  /**
   * Shoulders, just inside the head's lower sides — where this character
   * carries its paws, and the only place with clear air between the head and
   * the bar for an arm to be seen travelling through.
   */
  shoulderLeftX: 50,
  shoulderLeftY: 78,
  shoulderRightX: 74,
  shoulderRightY: 78,
  /** Where the free hand rests on the bar. */
  restX: 12,
  restY: 79,
  /** Reach of either arm, shoulder to wrist. */
  armLength: 54,
  /** How far the body may hang past the left end of the rail, so it keeps up. */
  overhang: 16,
  eyeLeftX: 48,
  eyeRightX: 76,
  eyeY: 45,
} as const;

/**
 * Wrist angles in the rest pose. A paw is authored for its own job — palm down
 * on the bar, cupped on the knob — so it only ever tilts *away* from that by a
 * fraction of what the forearm does, and never past `PAW_TILT_LIMIT`.
 */
const REST_WRIST_LEFT = -150;
const REST_WRIST_RIGHT = -11;
const PAW_TILT_LIMIT = 22;

/** Where the palm sits on the knob at rest, as an angle from the knob's centre. */
const GRIP_REST_ANGLE = -105;

const SPARK_COUNT = 6;
const SWEAT_COUNT = 2;

const clamp = (value: number, low: number, high: number) =>
  value < low ? low : value > high ? high : value;

type Point = { x: number; y: number };

type Sim = {
  width: number;
  scale: number;
  bodyX: number;
  bodyV: number;
  lean: number;
  leanV: number;
  head: number;
  headV: number;
  gazeX: number;
  gazeY: number;
  focus: number;
  idleBlend: number;
  rapidBlend: number;
  sweat: number;
  position: number;
  previousPosition: number;
  thumbVelocity: number;
  motionAt: number;
  rapid: boolean;
  rapidHoldUntil: number;
  rapidStartedAt: number;
  precisionStartedAt: number;
  /** Where the resting hand currently sits along the bar, in artwork units. */
  restX: number;
  gripSide: MascotGripSide;
  pointerDown: boolean;
  wasDragging: boolean;
  hovered: boolean;
  keyedUntil: number;
  pleasedUntil: number;
  blinkAt: number;
  blinkStart: number;
  headTiltAt: number;
  headTiltStart: number;
  headTiltDirection: number;
  eyeWanderAt: number;
  eyeWanderX: number;
  eyeWanderY: number;
  reaction: MascotReaction | null;
  reactionStart: number;
  pose: MascotPose;
  expression: MascotExpression;
  last: number;
};

export type WarmupSliderMascotProps = {
  /**
   * Optional controlled position, 0–1. Omit it and the mascot reads the range
   * input directly each frame, which keeps it in step with mouse, touch and
   * keyboard without re-rendering.
   */
  position?: number;
  /** Play a result state. Bump `reactionNonce` to replay the same one. */
  reaction?: MascotReaction | null;
  reactionNonce?: number;
  /** Centre line of the rail, measured from the top of `.slider-wrap`. */
  railCenter?: number;
  /** Rendered rail thickness, used to keep the arms clear of the bar. */
  railThickness?: number;
  /** Rendered thumb diameter, used to convert value → pixels. */
  thumbSize?: number;
  /** Force a size instead of deriving one from the rail width. */
  scale?: number;
  /** Hide the mascot (e.g. once a guess is locked). */
  hidden?: boolean;
  /** Fired only when pose, expression or reaction changes — never per frame. */
  onSnapshot?: (snapshot: MascotSnapshot) => void;
  className?: string;
};

function WarmupSliderMascotComponent({
  position,
  reaction = null,
  reactionNonce = 0,
  railCenter = 23,
  railThickness = 10,
  thumbSize = 30,
  scale,
  hidden = false,
  onSnapshot,
  className = "",
}: WarmupSliderMascotProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const artRef = useRef<HTMLDivElement | null>(null);
  const frontRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<SVGGElement | null>(null);
  const chestRef = useRef<SVGGElement | null>(null);
  const tailRef = useRef<SVGGElement | null>(null);
  const leftLegRef = useRef<SVGGElement | null>(null);
  const rightLegRef = useRef<SVGGElement | null>(null);
  const headRef = useRef<SVGGElement | null>(null);
  const eyeLeftRef = useRef<SVGGElement | null>(null);
  const eyeRightRef = useRef<SVGGElement | null>(null);
  const leftArmRef = useRef<SVGPathElement | null>(null);
  const leftArmEdgeRef = useRef<SVGPathElement | null>(null);
  const leftPawRef = useRef<SVGGElement | null>(null);
  const rightArmRef = useRef<SVGPathElement | null>(null);
  const rightArmEdgeRef = useRef<SVGPathElement | null>(null);
  const rightPawRef = useRef<SVGGElement | null>(null);
  const restFingersRef = useRef<SVGGElement | null>(null);
  const gripFingersRef = useRef<SVGGElement | null>(null);
  const sparkRefs = useRef<Array<SVGGElement | null>>([]);
  const sweatRefs = useRef<Array<SVGGElement | null>>([]);
  const mouthRefs = useRef<Record<MascotExpression, SVGGElement | null>>({
    panting: null,
    barking: null,
    growling: null,
    howling: null,
    neutral: null,
    anticipating: null,
    focused: null,
    pleased: null,
    surprised: null,
    delighted: null,
  });

  const positionRef = useRef<number | undefined>(position);
  const scaleRef = useRef<number | undefined>(scale);
  const railRef = useRef(railCenter);
  const railThicknessRef = useRef(railThickness);
  const thumbRef = useRef(thumbSize);
  const snapshotRef = useRef<WarmupSliderMascotProps["onSnapshot"]>(onSnapshot);
  const staticPlaceRef = useRef<() => void>(() => {});

  /* The loop reads these off refs so a prop change never restarts it. Synced in
   * an effect rather than during render, which React 19 forbids. */
  useEffect(() => {
    positionRef.current = position;
    scaleRef.current = scale;
    railRef.current = railCenter;
    railThicknessRef.current = railThickness;
    thumbRef.current = thumbSize;
    snapshotRef.current = onSnapshot;
    staticPlaceRef.current();
  });

  const simRef = useRef<Sim>({
    width: 0,
    scale: 1,
    bodyX: Number.NaN,
    bodyV: 0,
    lean: 0,
    leanV: 0,
    head: 0,
    headV: 0,
    gazeX: 0.4,
    gazeY: 0.3,
    focus: 0,
    idleBlend: 1,
    rapidBlend: 0,
    sweat: 0,
    position: 0,
    previousPosition: Number.NaN,
    thumbVelocity: 0,
    motionAt: 0,
    rapid: false,
    rapidHoldUntil: 0,
    rapidStartedAt: 0,
    precisionStartedAt: 0,
    restX: ART.restX,
    gripSide: "right",
    pointerDown: false,
    wasDragging: false,
    hovered: false,
    keyedUntil: 0,
    pleasedUntil: 0,
    blinkAt: 0,
    blinkStart: -1,
    headTiltAt: 0,
    headTiltStart: -1,
    headTiltDirection: 1,
    eyeWanderAt: 0,
    eyeWanderX: 0,
    eyeWanderY: 0,
    reaction: null,
    reactionStart: 0,
    pose: "idle",
    expression: "panting",
    last: 0,
  });

  /* Reactions are the one prop that changes the simulation, so it gets its own
   * effect rather than being polled. */
  useEffect(() => {
    const sim = simRef.current;
    sim.reaction = reaction;
    sim.reactionStart = reaction ? performance.now() : 0;
    if (layerRef.current) {
      layerRef.current.dataset.reaction = reaction ?? "";
    }
    if (reaction) playMascotSound(reaction);
  }, [reaction, reactionNonce]);

  useEffect(() => {
    const layer = layerRef.current;
    const art = artRef.current;
    const front = frontRef.current;
    if (!layer || !art || !front) return;

    const wrap = layer.parentElement;
    const input =
      wrap?.querySelector<HTMLInputElement>('input[type="range"]') ?? null;
    const sim = simRef.current;

    const reduced =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    const measure = () => {
      const width = (wrap ?? layer).clientWidth;
      sim.width = width;
      sim.scale = scaleRef.current ?? clamp(width / 560, 0.62, 1);
    };
    measure();

    const resize =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            measure();
            staticPlaceRef.current();
          })
        : null;
    if (resize && wrap) resize.observe(wrap);

    /* Interaction listeners are passive observers on the existing input. */
    const onPointerDown = () => {
      sim.pointerDown = true;
    };
    const endPointer = () => {
      if (!sim.pointerDown) return;
      sim.pointerDown = false;
      sim.pleasedUntil = performance.now() + MASCOT_MOTION.releasePleasedMs;
    };
    const onEnter = () => {
      sim.hovered = true;
    };
    const onLeave = () => {
      sim.hovered = false;
    };
    const onFocusIn = () => {
      sim.hovered = true;
    };
    const onFocusOut = () => {
      sim.hovered = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.key.startsWith("Arrow") && !/^(Page|Home|End)/.test(event.key)) {
        return;
      }
      sim.keyedUntil = performance.now() + 260;
    };

    const host = wrap ?? layer;
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerup", endPointer);
    window.addEventListener("pointercancel", endPointer);
    input?.addEventListener("focus", onFocusIn);
    input?.addEventListener("blur", onFocusOut);
    input?.addEventListener("keydown", onKeyDown);

    const readPosition = () => {
      const controlled = positionRef.current;
      if (typeof controlled === "number") return clamp(controlled, 0, 1);
      if (!input) return 0;
      const min = Number.parseFloat(input.min || "0");
      const max = Number.parseFloat(input.max || "1");
      const span = max - min || 1;
      return clamp((input.valueAsNumber - min) / span, 0, 1);
    };

    /** Centre of the knob, in layer pixels. */
    const knobCenter = () =>
      thumbRef.current / 2 +
      readPosition() * Math.max(sim.width - thumbRef.current, 0);

    const setMouth = (expression: MascotExpression) => {
      (Object.keys(mouthRefs.current) as MascotExpression[]).forEach((key) => {
        const node = mouthRefs.current[key];
        if (node) node.style.opacity = key === expression ? "1" : "0";
      });
    };

    let emitted = "";
    const emit = () => {
      const key = `${sim.pose}|${sim.expression}|${sim.reaction ?? ""}`;
      if (key === emitted) return;
      emitted = key;
      layer.dataset.pose = sim.pose;
      layer.dataset.expression = sim.expression;
      layer.dataset.reaction = sim.reaction ?? "";
      layer.dataset.gripSide = sim.gripSide;
      snapshotRef.current?.({
        pose: sim.pose,
        expression: sim.expression,
        reaction: sim.reaction,
        position: sim.position,
      });
    };

    const spin = (
      point: Point,
      cx: number,
      cy: number,
      degrees: number,
    ): Point => {
      const radians = (degrees * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const dx = point.x - cx;
      const dy = point.y - cy;
      return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
    };

    /**
     * A shoulder, put through every transform its own group is about to be
     * given — the head's turn, then the body's lean, breath and squash. This is
     * what keeps an arm rooted in the body no matter what the body is doing.
     */
    const onShoulder = (
      baseX: number,
      baseY: number,
      head: number,
      lean: number,
      lift: number,
      squash: number,
    ): Point => {
      const turned = spin({ x: baseX, y: baseY }, ART.neckX, ART.neckY, head);
      const scaled = {
        x: ART.pivotX + (turned.x - ART.pivotX) * (1 + squash),
        y:
          ART.pivotY + (turned.y - ART.pivotY) * (1 - squash * 0.8) + lift,
      };
      return spin(scaled, ART.pivotX, ART.pivotY, lean);
    };

    /**
     * One arm, from a shoulder to a planted hand. Slack in the reach becomes a
     * bow rather than a fold, capped so the limb stays clear of the bar it is
     * standing behind — an arm that dips under the bar reads as a broken one.
     * Returns the wrist angle so the paw can follow it.
     */
    const drawArm = (
      path: SVGPathElement | null,
      edge: SVGPathElement | null,
      paw: SVGGElement | null,
      shoulder: Point,
      hand: Point,
      restWrist: number,
      tilt: number,
      barTop: number,
    ) => {
      const span = Math.hypot(hand.x - shoulder.x, hand.y - shoulder.y) || 1;
      const midX = (shoulder.x + hand.x) / 2;
      const midY = (shoulder.y + hand.y) / 2;
      const bow = Math.min(
        5 + Math.max(0, ART.armLength - span) * 0.42,
        Math.max(0, (barTop - 1 - midY) * 2),
      );
      const controlY = midY + bow;
      const d = `M${shoulder.x.toFixed(1)} ${shoulder.y.toFixed(1)}Q${midX.toFixed(1)} ${controlY.toFixed(1)} ${hand.x.toFixed(1)} ${hand.y.toFixed(1)}`;
      path?.setAttribute("d", d);
      edge?.setAttribute("d", d);

      const wrist =
        (Math.atan2(hand.y - controlY, hand.x - midX) * 180) / Math.PI;
      const tilted = clamp(
        (wrist - restWrist) * tilt,
        -PAW_TILT_LIMIT,
        PAW_TILT_LIMIT,
      );
      paw?.setAttribute(
        "transform",
        `translate(${hand.x.toFixed(1)} ${hand.y.toFixed(1)}) rotate(${tilted.toFixed(1)})`,
      );
      return tilted;
    };

    /**
     * Places both arms for the frame. `follow` is how far the resting hand may
     * slide toward its target this frame — 1 snaps it, which is what the static,
     * reduced-motion placement wants.
     */
    const placeLimbs = (
      head: number,
      lean: number,
      lift: number,
      squash: number,
      follow: number,
    ) => {
      const scaleNow = sim.scale;
      const knobX = knobCenter();
      /* Everything below is artwork units: the knob and the bar are fixed on
       * screen, so they move within the artwork as the body slides. */
      const knobU = (knobX - sim.bodyX) / scaleNow;
      const knobR = thumbRef.current / 2 / scaleNow;
      const barTop = ART.railY - railThicknessRef.current / 2 / scaleNow;

      /* ── Gripping hand: the knob, or as near as the arm reaches ──────────── */
      const gripOnLeft = sim.gripSide === "left";
      const gripShoulder = onShoulder(
        gripOnLeft ? ART.shoulderLeftX : ART.shoulderRightX,
        gripOnLeft ? ART.shoulderLeftY : ART.shoulderRightY,
        head,
        lean,
        lift,
        squash,
      );
      const gripX = knobU + (gripOnLeft ? 1 : -1) * knobR * 0.25;
      const gripY = ART.railY - knobR * 0.95;
      const gripHand: Point = { x: gripX, y: gripY };

      /* ── Resting hand: on the bar, kept clear of the knob ────────────────── */
      const freeShoulder = onShoulder(
        gripOnLeft ? ART.shoulderRightX : ART.shoulderLeftX,
        gripOnLeft ? ART.shoulderRightY : ART.shoulderLeftY,
        head,
        lean,
        lift,
        squash,
      );
      const restTargetX = gripOnLeft ? ART.pivotX * 2 - ART.restX : ART.restX;
      const wanted = sim.bodyX + restTargetX * scaleNow;
      const restOverhang = -Math.min(ART.overhang, 10) * scaleNow;
      const parked = gripOnLeft
        ? clamp(
            wanted,
            Math.min(
              sim.width - restOverhang,
              knobX + (knobR + 18) * scaleNow,
            ),
            sim.width - restOverhang,
          )
        : clamp(
            wanted,
            restOverhang,
            Math.max(
              restOverhang,
              knobX - (knobR + 18) * scaleNow,
            ),
          );
      sim.restX += ((parked - sim.bodyX) / scaleNow - sim.restX) * follow;
      const freeHand: Point = { x: sim.restX, y: ART.restY };

      const freeTilt = drawArm(
        gripOnLeft ? rightArmRef.current : leftArmRef.current,
        gripOnLeft ? rightArmEdgeRef.current : leftArmEdgeRef.current,
        gripOnLeft ? rightPawRef.current : leftPawRef.current,
        freeShoulder,
        freeHand,
        gripOnLeft ? REST_WRIST_RIGHT : REST_WRIST_LEFT,
        0.4,
        barTop,
      );
      drawArm(
        gripOnLeft ? leftArmRef.current : rightArmRef.current,
        gripOnLeft ? leftArmEdgeRef.current : rightArmEdgeRef.current,
        gripOnLeft ? leftPawRef.current : rightPawRef.current,
        gripShoulder,
        gripHand,
        gripOnLeft ? -169 : REST_WRIST_RIGHT,
        0.6,
        barTop,
      );

      /* ── Fingers, drawn in front of the bar and the knob ─────────────────── */
      restFingersRef.current?.setAttribute(
        "transform",
        `translate(${freeHand.x.toFixed(1)} ${freeHand.y.toFixed(1)}) rotate(${freeTilt.toFixed(1)})`,
      );
      /* Authored for a 15-unit knob with the palm at its top: sizing to the real
       * knob and turning with the palm keeps the grip together at any scale. */
      const palmAngle =
        (Math.atan2(gripHand.y - ART.railY, gripHand.x - knobU) * 180) /
        Math.PI;
      const gripRestAngle = gripOnLeft ? -75 : GRIP_REST_ANGLE;
      const gripScale = knobR / 15;
      gripFingersRef.current?.setAttribute(
        "transform",
        `translate(${knobU.toFixed(1)} ${ART.railY}) rotate(${(palmAngle - gripRestAngle).toFixed(1)}) scale(${gripOnLeft ? -gripScale : gripScale} ${gripScale})`,
      );
    };

    /** One-shot placement with no motion at all. */
    const placeStatic = () => {
      const scaleNow = sim.scale;
      const target = knobCenter() + (ART.handNudge - ART.handX) * scaleNow;
      const minX = -ART.overhang * scaleNow;
      const maxX = sim.width - (ART.width - 16) * scaleNow;
      sim.bodyX = clamp(target, minX, Math.max(maxX, minX));
      sim.bodyV = 0;
      sim.lean = 0;
      sim.leanV = 0;
      sim.head = 0;
      sim.headV = 0;
      sim.thumbVelocity = 0;
      sim.previousPosition = readPosition();
      sim.motionAt = performance.now();
      sim.rapid = false;
      sim.idleBlend = 0;
      sim.rapidBlend = 0;
      sim.sweat = 0;
      sim.gripSide = "right";
      const top = railRef.current - (ART.handY + ART.handLift) * scaleNow;
      const transform = `translate3d(${sim.bodyX}px, ${top}px, 0) scale(${scaleNow})`;
      art.style.transform = transform;
      front.style.transform = transform;
      rootRef.current?.setAttribute("transform", "");
      chestRef.current?.setAttribute("transform", "");
      tailRef.current?.setAttribute("transform", "");
      leftLegRef.current?.setAttribute("transform", "");
      rightLegRef.current?.setAttribute("transform", "");
      headRef.current?.setAttribute("transform", "");
      sweatRefs.current.forEach((node) => {
        if (node) node.style.opacity = "0";
      });
      placeLimbs(0, 0, 0, 0, 1);
      sim.pose = sim.hovered ? "ready" : "idle";
      sim.expression = sim.hovered ? "anticipating" : "panting";
      setMouth(sim.expression);
      layer.dataset.pose = sim.pose;
      layer.dataset.expression = sim.expression;
      layer.dataset.reaction = sim.reaction ?? "";
    };

    const syncStatic = () => {
      if (!reduced?.matches) return;
      measure();
      placeStatic();
    };
    staticPlaceRef.current = syncStatic;
    input?.addEventListener("input", syncStatic);
    input?.addEventListener("change", syncStatic);

    let frame = 0;
    let onScreen = true;

    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      const dt = clamp((now - sim.last) / 16.667, 0.2, 3);
      sim.last = now;
      measure();

      const scaleNow = sim.scale;
      const position = readPosition();
      sim.position = position;
      const dragging = sim.pointerDown || now < sim.keyedUntil;
      const elapsedMs =
        sim.motionAt === 0 ? 16.667 : clamp(now - sim.motionAt, 4, 64);

      if (Number.isNaN(sim.previousPosition)) {
        sim.previousPosition = position;
      }
      sim.thumbVelocity = dragging
        ? smoothThumbVelocity(
            sim.thumbVelocity,
            position - sim.previousPosition,
            elapsedMs,
          )
        : 0;
      sim.previousPosition = position;
      sim.motionAt = now;

      const thumbSpeed = Math.abs(sim.thumbVelocity);
      const rapidState = resolveRapidDrag(
        { active: sim.rapid, holdUntil: sim.rapidHoldUntil },
        thumbSpeed,
        now,
        dragging,
      );
      if (!sim.rapid && rapidState.active) sim.rapidStartedAt = now;
      sim.rapid = rapidState.active;
      sim.rapidHoldUntil = rapidState.holdUntil;

      const precise = isPrecisionMovement(dragging, sim.rapid, thumbSpeed);
      if (precise && sim.precisionStartedAt === 0) {
        sim.precisionStartedAt = now;
      } else if (!precise) {
        sim.precisionStartedAt = 0;
      }
      const precisionNervous =
        precise &&
        now - sim.precisionStartedAt >= MASCOT_MOTION.precisionNervousAfterMs;

      if (sim.wasDragging && !dragging && !sim.reaction) {
        sim.pleasedUntil = now + MASCOT_MOTION.releasePleasedMs;
      }
      sim.wasDragging = dragging;

      /* ── Body follows the knob, the arms take up the difference ──────────── */
      const knobX = knobCenter();
      const rightGripAnchor = ART.handX - ART.handNudge;
      const leftGripAnchor = ART.pivotX * 2 - rightGripAnchor;
      const minX = -ART.overhang * scaleNow;
      const maxX = Math.max(sim.width - (ART.width - 16) * scaleNow, minX);
      if (Number.isNaN(sim.bodyX)) {
        sim.bodyX = clamp(
          knobX - rightGripAnchor * scaleNow,
          minX,
          maxX,
        );
      }
      const thumbWithinBody = (knobX - sim.bodyX) / scaleNow;
      const nextGripSide = resolveGripSide(
        sim.gripSide,
        thumbWithinBody,
        ART.pivotX,
        sim.rapid,
      );
      if (nextGripSide !== sim.gripSide) {
        sim.gripSide = nextGripSide;
        layer.dataset.gripSide = sim.gripSide;
        sim.restX =
          sim.gripSide === "left" ? ART.pivotX * 2 - ART.restX : ART.restX;
      }
      const gripAnchor =
        sim.gripSide === "left" ? leftGripAnchor : rightGripAnchor;
      const rawX = knobX - gripAnchor * scaleNow;
      const targetX = clamp(rawX, minX, maxX);

      const bodySpring = sim.rapid ? 0.11 : precise ? 0.34 : 0.26;
      const bodyDamping = sim.rapid ? 0.87 : precise ? 0.72 : 0.78;
      sim.bodyV += (targetX - sim.bodyX) * bodySpring * dt;
      sim.bodyV *= Math.pow(bodyDamping, dt);
      sim.bodyX += sim.bodyV * dt;

      const drag =
        (sim.rapid ? rapidDragReach(thumbSpeed) : MASCOT_LIMITS.armReach) *
        scaleNow;
      sim.bodyX = clamp(sim.bodyX, targetX - drag, targetX + drag);
      /* How far the knob has run from the body, for the gaze and the lean. */
      const lag = (rawX - sim.bodyX) / scaleNow;


      /* ── Pose ────────────────────────────────────────────────────────────── */
      sim.focus += ((precise ? 1 : 0) - sim.focus) * 0.09 * dt;

      const activeReaction = sim.reaction;
      let reactionT = 0;
      if (activeReaction) {
        reactionT =
          (now - sim.reactionStart) / MASCOT_REACTION_MS[activeReaction];
        if (reactionT >= 1) {
          sim.reaction = null;
          reactionT = 0;
        }
      }

      sim.pose = sim.reaction
        ? "reacting"
        : sim.rapid
          ? "rapidDrag"
          : precise
            ? "precision"
            : dragging
              ? "dragging"
              : now < sim.pleasedUntil
                ? "settling"
                : sim.hovered
                  ? "ready"
                  : "idle";

      sim.rapidBlend +=
        ((sim.pose === "rapidDrag" ? 1 : 0) - sim.rapidBlend) * 0.2 * dt;
      sim.idleBlend +=
        ((sim.pose === "idle" ? 1 : 0) - sim.idleBlend) *
        clamp(0.09 * dt, 0, 1);
      const sweatTarget =
        sim.pose === "rapidDrag" ? 1 : precisionNervous ? 0.24 : 0;
      const sweatFollow =
        sweatTarget > sim.sweat
          ? clamp(0.24 * dt, 0, 1)
          : clamp((dt * 16.667) / MASCOT_MOTION.sweatFadeMs, 0, 1);
      sim.sweat += (sweatTarget - sim.sweat) * sweatFollow;

      /* ── Lean, follow-through, squash ────────────────────────────────────── */
      const movementDirection =
        Math.sign(sim.thumbVelocity) ||
        Math.sign(lag) ||
        Math.sign(sim.bodyV) ||
        1;
      const leanTarget = clamp(
        (sim.bodyV / scaleNow) * 0.5 +
          sim.focus * movementDirection * 2.8 +
          sim.rapidBlend * movementDirection * 5.2 +
          (sim.hovered ? 1.4 : 0) +
          /* Leaning after a knob the arm is straining for reads as effort. */
          clamp(lag * 0.06, -3, 3),
        -MASCOT_LIMITS.lean,
        MASCOT_LIMITS.lean,
      );
      sim.leanV += (leanTarget - sim.lean) * 0.3 * dt;
      sim.leanV *= Math.pow(0.72, dt);
      sim.lean += sim.leanV * dt;

      const rapidAge = sim.rapid ? now - sim.rapidStartedAt : 1000;
      const rapidCounter =
        sim.rapid && rapidAge < 180
          ? -movementDirection * 4 * (1 - rapidAge / 180)
          : 0;
      const headTarget = clamp(
        sim.lean * 1.05 + rapidCounter,
        -MASCOT_LIMITS.headTurn,
        MASCOT_LIMITS.headTurn,
      );
      sim.headV += (headTarget - sim.head) * 0.14 * dt;
      sim.headV *= Math.pow(0.82, dt);
      sim.head += sim.headV * dt;

      const bodySpeed = Math.abs(sim.bodyV) / scaleNow;
      let squash = clamp(
        thumbSpeed * 0.018 + bodySpeed * 0.002,
        0,
        MASCOT_LIMITS.squash,
      );
      const breath =
        sim.pose === "idle"
          ? Math.sin(now / 1450) * MASCOT_LIMITS.breath
          : sim.pose === "ready"
            ? Math.sin(now / 1450) * MASCOT_LIMITS.breath * 0.35
            : 0;
      const idleSwayPhase =
        (now / MASCOT_MOTION.idleSwayCycleMs) * Math.PI * 2;
      const idleTailPhase =
        (now / MASCOT_MOTION.idleTailCycleMs) * Math.PI * 2;
      const idleSway =
        Math.sin(idleSwayPhase) *
        MASCOT_LIMITS.idleSway *
        sim.idleBlend;
      const idleBounce =
        Math.sin(idleSwayPhase * 2 + 0.4) * 0.75 * sim.idleBlend;
      let lift = idleBounce;
      let lean = sim.lean + idleSway;
      let head =
        sim.head +
        Math.sin(idleSwayPhase - 0.48) *
          MASCOT_LIMITS.idleHeadFollow *
          sim.idleBlend;
      let headLift = 0;
      let headScaleY = 1;
      let eyeOpen = 1 - sim.focus * 0.24;
      let barkPulse = 0;
      let growlStrength = 0;
      let howlStrength = 0;

      /* ── Expression ──────────────────────────────────────────────────────── */
      let expression: MascotExpression =
        sim.pose === "rapidDrag"
          ? "surprised"
          : sim.pose === "precision"
            ? "focused"
            : sim.pose === "settling"
              ? "pleased"
              : sim.pose === "ready"
                ? "anticipating"
                : sim.pose === "idle"
                  ? "panting"
                  : "neutral";

      /* ── Reactions ───────────────────────────────────────────────────────── */
      if (sim.reaction) {
        const t = clamp(reactionT, 0, 1);
        const out = 1 - t;
        expression = MASCOT_REACTION_FACE[sim.reaction];
        if (sim.reaction === "closeAnswer") {
          const attack = Math.sin(
            (Math.PI / 2) * clamp(t / 0.18, 0, 1),
          );
          const release = t > 0.82 ? clamp((1 - t) / 0.18, 0, 1) : 1;
          howlStrength = attack * release;
          head -= 10.5 * howlStrength;
          headLift -= 4.8 * howlStrength;
          headScaleY += 0.045 * howlStrength;
          lift -= 2.8 * howlStrength;
          squash -= 0.032 * howlStrength;
          eyeOpen = 1 - 0.82 * howlStrength;
        } else if (sim.reaction === "averageAnswer") {
          barkPulse = Math.max(0, Math.sin(t * Math.PI * 4)) * out;
          head += Math.sin(t * Math.PI * 4) * 3.2 * out;
          headLift += barkPulse * 1.8;
          lift -= barkPulse * 3.4;
          squash += barkPulse * 0.026;
          eyeOpen = 1.08 - barkPulse * 0.18;
        } else if (sim.reaction === "wideAnswer") {
          const attack = Math.sin(
            (Math.PI / 2) * clamp(t / 0.16, 0, 1),
          );
          const release = t > 0.76 ? clamp((1 - t) / 0.24, 0, 1) : 1;
          growlStrength = attack * release;
          lean += 3.2 * growlStrength;
          head +=
            4.4 * growlStrength +
            Math.sin(t * Math.PI * 18) * 0.7 * growlStrength;
          headLift += 2.2 * growlStrength;
          squash += 0.018 * growlStrength;
          eyeOpen = 1 - 0.48 * growlStrength;
        } else if (sim.reaction === "farAnswer") {
          lean -= 7 * Math.sin(Math.PI * Math.min(t * 1.6, 1));
          head += Math.sin(t * Math.PI * 7) * 2.4 * out;
          eyeOpen = 1.18 - t * 0.18;
        } else {
          /* Bullseye keeps the established jump-and-spark celebration. */
          if (t < 0.16) {
            squash = -0.1 * (t / 0.16);
            lift += 3 * (t / 0.16);
          } else if (t < 0.74) {
            const air = (t - 0.16) / 0.58;
            lift -= Math.sin(Math.PI * air) * 30;
            squash = 0.05 * Math.sin(Math.PI * air);
            head += Math.sin(Math.PI * air) * 5;
          } else {
            const land = (t - 0.74) / 0.26;
            squash = -0.07 * Math.sin(Math.PI * land);
          }
        }
      }

      /* ── Blink ───────────────────────────────────────────────────────────── */
      if (sim.pose === "idle") {
        if (sim.headTiltAt === 0) {
          sim.headTiltAt = now + 10000 + Math.random() * 8000;
        }
        if (sim.headTiltStart < 0 && now >= sim.headTiltAt) {
          sim.headTiltStart = now;
          sim.headTiltDirection = Math.random() < 0.5 ? -1 : 1;
        }
        if (sim.headTiltStart >= 0) {
          const tiltT = (now - sim.headTiltStart) / 1300;
          if (tiltT >= 1) {
            sim.headTiltStart = -1;
            sim.headTiltAt = now + 10000 + Math.random() * 8000;
          } else {
            head +=
              Math.sin(tiltT * Math.PI) * 2.2 * sim.headTiltDirection;
          }
        }
      } else {
        sim.headTiltStart = -1;
        if (sim.headTiltAt <= now) {
          sim.headTiltAt = now + 10000 + Math.random() * 8000;
        }
      }

      lean = clamp(lean, -MASCOT_LIMITS.lean, MASCOT_LIMITS.lean);
      head = clamp(
        head,
        -MASCOT_LIMITS.headTurn - 3,
        MASCOT_LIMITS.headTurn + 3,
      );
      squash = clamp(
        squash,
        -MASCOT_LIMITS.squash,
        MASCOT_LIMITS.squash,
      );

      const blinkAllowed =
        sim.pose === "idle" ||
        sim.pose === "ready" ||
        sim.pose === "settling";
      if (sim.blinkAt === 0) sim.blinkAt = now + 3000 + Math.random() * 4000;
      if (blinkAllowed && sim.blinkStart < 0 && now >= sim.blinkAt) {
        sim.blinkStart = now;
      } else if (!blinkAllowed && sim.blinkAt <= now) {
        sim.blinkAt = now + 1200;
      }
      if (sim.blinkStart >= 0) {
        const b = (now - sim.blinkStart) / 140;
        if (b >= 1) {
          sim.blinkStart = -1;
          sim.blinkAt = now + 3000 + Math.random() * 4000;
        } else {
          eyeOpen *= Math.abs(1 - Math.sin(b * Math.PI) * 0.96);
        }
      }

      /* ── Gaze: always toward the knob, further ahead while moving ────────── */
      if (sim.pose === "idle" && now >= sim.eyeWanderAt) {
        sim.eyeWanderAt = now + 2000 + Math.random() * 3000;
        sim.eyeWanderX = (Math.random() - 0.5) * 0.18;
        sim.eyeWanderY = (Math.random() - 0.5) * 0.1;
      } else if (sim.pose !== "idle") {
        sim.eyeWanderX *= Math.pow(0.72, dt);
        sim.eyeWanderY *= Math.pow(0.72, dt);
      }
      const gazeXTarget = clamp(
        0.42 +
          lag * 0.02 +
          sim.thumbVelocity * 0.1 +
          sim.focus * movementDirection * 0.2 +
          sim.eyeWanderX,
        -1,
        1,
      );
      const gazeYTarget = 0.28 + sim.focus * 0.4 + sim.eyeWanderY;
      sim.gazeX += (gazeXTarget - sim.gazeX) * 0.12 * dt;
      sim.gazeY += (gazeYTarget - sim.gazeY) * 0.12 * dt;

      /* ── Write to the DOM ────────────────────────────────────────────────── */
      const top = railRef.current - (ART.handY + ART.handLift) * scaleNow;
      const transform = `translate3d(${sim.bodyX}px, ${top}px, 0) scale(${scaleNow})`;
      art.style.transform = transform;
      front.style.transform = transform;

      rootRef.current?.setAttribute(
        "transform",
        `rotate(${lean.toFixed(2)} ${ART.pivotX} ${ART.pivotY}) translate(0 ${lift.toFixed(2)}) translate(${ART.pivotX} ${ART.pivotY}) scale(${(1 + squash).toFixed(4)} ${(1 - squash * 0.8).toFixed(4)}) translate(${-ART.pivotX} ${-ART.pivotY})`,
      );
      const chestScaleY = 1 + breath / 250;
      chestRef.current?.setAttribute(
        "transform",
        `translate(${ART.pivotX} 108) scale(1 ${(chestScaleY + howlStrength * 0.025).toFixed(4)}) translate(${-ART.pivotX} -108)`,
      );
      const legSwing =
        Math.sin(idleSwayPhase + 0.55) *
        MASCOT_LIMITS.idleLegSwing *
        sim.idleBlend;
      let tailWag =
        (Math.sin(idleTailPhase - 0.7) * MASCOT_LIMITS.idleTailWag +
          idleSway * 0.65) *
        sim.idleBlend;
      if (sim.reaction === "averageAnswer") {
        tailWag += Math.sin(reactionT * Math.PI * 8) * 13 * (1 - reactionT);
      } else if (sim.reaction === "closeAnswer") {
        tailWag += Math.sin(reactionT * Math.PI * 3) * 7 * howlStrength;
      } else if (sim.reaction === "wideAnswer") {
        tailWag +=
          18 * growlStrength +
          Math.sin(reactionT * Math.PI * 12) * 2.4 * growlStrength;
      }
      tailRef.current?.setAttribute(
        "transform",
        `rotate(${tailWag.toFixed(2)} 88 110)`,
      );
      leftLegRef.current?.setAttribute(
        "transform",
        `rotate(${legSwing.toFixed(2)} 52 116)`,
      );
      rightLegRef.current?.setAttribute(
        "transform",
        `rotate(${(-legSwing).toFixed(2)} 72 116)`,
      );
      headRef.current?.setAttribute(
        "transform",
        `translate(0 ${headLift.toFixed(2)}) translate(${ART.neckX} ${ART.neckY}) rotate(${head.toFixed(2)}) scale(1 ${headScaleY.toFixed(4)}) translate(${-ART.neckX} ${-ART.neckY})`,
      );
      mouthRefs.current.barking?.setAttribute(
        "transform",
        `translate(62 68) scale(1 ${(0.52 + barkPulse * 0.8).toFixed(3)}) translate(-62 -68)`,
      );
      mouthRefs.current.growling?.setAttribute(
        "transform",
        `translate(${(Math.sin(reactionT * Math.PI * 20) * 0.65 * growlStrength).toFixed(2)} 0) translate(62 68) scale(${(1 + growlStrength * 0.08).toFixed(3)} ${(0.72 + growlStrength * 0.28).toFixed(3)}) translate(-62 -68)`,
      );
      mouthRefs.current.howling?.setAttribute(
        "transform",
        `translate(62 67) scale(${(0.92 + howlStrength * 0.08).toFixed(3)} ${(0.78 + howlStrength * 0.38 + Math.sin(reactionT * Math.PI * 8) * 0.04 * howlStrength).toFixed(3)}) translate(-62 -67)`,
      );

      for (let index = 0; index < SWEAT_COUNT; index += 1) {
        const node = sweatRefs.current[index];
        if (!node) continue;
        const precisionDrop = precisionNervous && index === 0;
        const opacity = precisionNervous
          ? precisionDrop
            ? sim.sweat
            : 0
          : sim.sweat * (1 - index * 0.22);
        const side = movementDirection > 0 ? -1 : 1;
        const x = ART.neckX + side * (37 + index * 7);
        const y = 30 + index * 10;
        node.style.opacity = opacity.toFixed(3);
        node.setAttribute(
          "transform",
          `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${side * 16}) scale(${(0.72 + opacity * 0.28).toFixed(3)})`,
        );
      }

      placeLimbs(head, lean, lift, squash, clamp(0.22 * dt, 0, 1));

      const eyeScaleY = clamp(eyeOpen, 0.04, 1.2);
      const gx = sim.gazeX * 3.4;
      const gy = sim.gazeY * 2.6;
      eyeLeftRef.current?.setAttribute(
        "transform",
        `translate(${(ART.eyeLeftX + gx).toFixed(2)} ${(ART.eyeY + gy).toFixed(2)}) scale(1 ${eyeScaleY.toFixed(3)})`,
      );
      eyeRightRef.current?.setAttribute(
        "transform",
        `translate(${(ART.eyeRightX + gx).toFixed(2)} ${(ART.eyeY + gy).toFixed(2)}) scale(1 ${eyeScaleY.toFixed(3)})`,
      );

      if (expression !== sim.expression) {
        sim.expression = expression;
        setMouth(expression);
      }

      /* ── Celebration sparks ──────────────────────────────────────────────── */
      const sparking = sim.reaction === "perfectAnswer";
      for (let index = 0; index < SPARK_COUNT; index += 1) {
        const node = sparkRefs.current[index];
        if (!node) continue;
        if (!sparking) {
          if (node.style.opacity !== "0") node.style.opacity = "0";
          continue;
        }
        const delay = index * 0.045;
        const t = clamp((reactionT - 0.14 - delay) / 0.62, 0, 1);
        const angle = (-140 + index * 36) * (Math.PI / 180);
        const distance = 12 + t * (30 + index * 5);
        node.style.opacity = String(t > 0 && t < 1 ? (1 - t) * 0.95 : 0);
        node.setAttribute(
          "transform",
          `translate(${(ART.neckX + Math.cos(angle) * distance).toFixed(1)} ${(24 + Math.sin(angle) * distance).toFixed(1)}) scale(${(0.5 + (1 - t) * 0.8).toFixed(2)})`,
        );
      }

      emit();
    };

    const start = () => {
      if (frame || reduced?.matches) return;
      sim.last = performance.now();
      frame = requestAnimationFrame(step);
    };
    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    /* Off-screen mascots cost nothing. */
    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(
            (entries) => {
              onScreen = entries.some((entry) => entry.isIntersecting);
              if (onScreen) start();
              else {
                stop();
                placeStatic();
              }
            },
            { rootMargin: "80px" },
          )
        : null;
    observer?.observe(layer);

    const onMotionChange = () => {
      if (reduced?.matches) {
        stop();
        syncStatic();
      } else if (onScreen) {
        start();
      }
    };
    reduced?.addEventListener("change", onMotionChange);

    if (reduced?.matches) syncStatic();
    else start();

    return () => {
      stop();
      observer?.disconnect();
      resize?.disconnect();
      staticPlaceRef.current = () => {};
      reduced?.removeEventListener("change", onMotionChange);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerup", endPointer);
      window.removeEventListener("pointercancel", endPointer);
      input?.removeEventListener("focus", onFocusIn);
      input?.removeEventListener("blur", onFocusOut);
      input?.removeEventListener("keydown", onKeyDown);
      input?.removeEventListener("input", syncStatic);
      input?.removeEventListener("change", syncStatic);
    };
  }, []);

  const body = "var(--gt-mascot-body)";
  const ink = "var(--gt-mascot-ink)";
  const edge = ink;
  const veil = hidden
    ? ({ opacity: 0, visibility: "hidden" } as const)
    : undefined;

  return (
    <>
      <div
        ref={layerRef}
        className={`gt-mascot-layer ${className}`.trim()}
        aria-hidden="true"
        style={veil}
      >
        <div ref={artRef} className="gt-mascot-art">
          <svg
            width={ART.width}
            height={ART.height}
            viewBox={`0 0 ${ART.width} ${ART.height}`}
            focusable="false"
          >
            <defs>
              <linearGradient id="gtMascotBody" x1="0.1" y1="0" x2="0.8" y2="1">
                <stop offset="0" stopColor="var(--gt-mascot-body)" />
                <stop offset="0.62" stopColor="var(--gt-mascot-body)" />
                <stop offset="1" stopColor="var(--gt-mascot-body-shade)" />
              </linearGradient>
            </defs>

            <g ref={rootRef} data-mascot-part="body-root">
              {/* Chest, crossed by the rail so the mascot reads as standing behind it. */}
              <g ref={chestRef}>
                <g ref={tailRef} data-mascot-part="tail">
                  <path
                    d="M88 110C99 109 106 103 108 94"
                    fill="none"
                    stroke={edge}
                    strokeWidth="11.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M88 110C99 109 106 103 108 94"
                    fill="none"
                    stroke="url(#gtMascotBody)"
                    strokeWidth="8.2"
                    strokeLinecap="round"
                  />
                </g>
                <g ref={leftLegRef} data-mascot-part="left-leg">
                  <path
                    d="M52 116C48 130 47 144 48 154"
                    fill="none"
                    stroke={edge}
                    strokeWidth="12.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M52 116C48 130 47 144 48 154"
                    fill="none"
                    stroke="url(#gtMascotBody)"
                    strokeWidth="9.2"
                    strokeLinecap="round"
                  />
                  <g transform="translate(47 158) rotate(-8)">
                    <ellipse
                      rx="10.5"
                      ry="8.2"
                      fill="url(#gtMascotBody)"
                      stroke={edge}
                      strokeWidth="1.6"
                    />
                    <g
                      fill="none"
                      stroke={edge}
                      strokeWidth="1.1"
                      strokeLinecap="round"
                    >
                      <path d="M-4 -0.4C-4.6 1.8 -4.8 3.4 -4.6 5" />
                      <path d="M0.2 -1.2C0.2 1.4 0.2 3.4 0.4 5.4" />
                      <path d="M4.4 -0.4C4.8 1.8 5 3.4 4.8 4.8" />
                    </g>
                  </g>
                </g>
                <g ref={rightLegRef} data-mascot-part="right-leg">
                  <path
                    d="M72 116C76 130 77 144 76 154"
                    fill="none"
                    stroke={edge}
                    strokeWidth="12.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M72 116C76 130 77 144 76 154"
                    fill="none"
                    stroke="url(#gtMascotBody)"
                    strokeWidth="9.2"
                    strokeLinecap="round"
                  />
                  <g transform="translate(77 158) rotate(8)">
                    <ellipse
                      rx="10.5"
                      ry="8.2"
                      fill="url(#gtMascotBody)"
                      stroke={edge}
                      strokeWidth="1.6"
                    />
                    <g
                      fill="none"
                      stroke={edge}
                      strokeWidth="1.1"
                      strokeLinecap="round"
                    >
                      <path d="M-4 -0.4C-4.6 1.8 -4.8 3.4 -4.6 5" />
                      <path d="M0.2 -1.2C0.2 1.4 0.2 3.4 0.4 5.4" />
                      <path d="M4.4 -0.4C4.8 1.8 5 3.4 4.8 4.8" />
                    </g>
                  </g>
                </g>
                <ellipse
                  cx={ART.neckX}
                  cy="106"
                  rx="30"
                  ry="30"
                  fill="url(#gtMascotBody)"
                  stroke={edge}
                  strokeWidth="1.6"
                />
                <path
                  d="M62 90C73 94 77.6 104 77.6 112.4C77.6 122.4 71 130.4 62 132.4C53 130.4 46.4 122.4 46.4 112.4C46.4 104 51 94 62 90Z"
                  fill="#ffffff"
                  stroke={edge}
                  strokeWidth="1"
                  strokeOpacity="0.16"
                  data-mascot-part="belly-patch"
                />
              </g>

              <g ref={headRef}>
                <g
                  transform="translate(42 22) rotate(22)"
                  data-mascot-part="floppy-ear"
                >
                  <path
                    d="M3 -15C-8 -15 -15 -5 -16 8C-17 20 -13 28 -7 28C-1 28 2 20 3 12C4 3 4 -6 3 -15Z"
                    fill="url(#gtMascotBody)"
                    stroke={edge}
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M1 -9C-7 -3 -10 10 -7 23"
                    fill="none"
                    stroke={edge}
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                </g>
                <g
                  transform="translate(82 22) scale(-1 1) rotate(22)"
                  data-mascot-part="floppy-ear"
                >
                  <path
                    d="M3 -15C-8 -15 -15 -5 -16 8C-17 20 -13 28 -7 28C-1 28 2 20 3 12C4 3 4 -6 3 -15Z"
                    fill="url(#gtMascotBody)"
                    stroke={edge}
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M1 -9C-7 -3 -10 10 -7 23"
                    fill="none"
                    stroke={edge}
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                </g>
                <ellipse
                  cx={ART.neckX}
                  cy="47"
                  rx="34.5"
                  ry="32"
                  fill="url(#gtMascotBody)"
                  stroke={edge}
                  strokeWidth="1.6"
                />

                <g ref={eyeLeftRef}>
                  <ellipse rx="5.8" ry="8.2" fill={ink} />
                  <circle cx="1.6" cy="-3.4" r="1.8" fill="#ffffff" />
                </g>
                <g ref={eyeRightRef}>
                  <ellipse rx="5.8" ry="8.2" fill={ink} />
                  <circle cx="1.6" cy="-3.4" r="1.8" fill="#ffffff" />
                </g>

                <ellipse
                  cx="62"
                  cy="60"
                  rx="6.6"
                  ry="5"
                  fill={ink}
                  data-mascot-part="nose"
                />
                <ellipse
                  cx="62"
                  cy="57.6"
                  rx="3.4"
                  ry="1.3"
                  fill="#ffffff"
                  opacity="0.26"
                />

                {/* One mouth visible at a time; swapped by opacity. */}
                <g
                  ref={(node) => {
                    mouthRefs.current.panting = node;
                  }}
                  className="gt-mascot-panting-mouth"
                  data-mascot-part="panting-mouth"
                >
                  <path
                    d="M55.5 66C56.5 77 67.5 77 68.5 66Z"
                    fill={ink}
                    stroke={ink}
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    className="gt-mascot-panting-tongue"
                    d="M58.5 70.5C58.8 78.5 65.2 78.5 65.5 70.5Z"
                    fill="var(--gt-mascot-tongue)"
                  />
                </g>
                <g
                  ref={(node) => {
                    mouthRefs.current.barking = node;
                  }}
                  style={{ opacity: 0 }}
                  data-mascot-part="barking-mouth"
                >
                  <path
                    d="M55.5 65.5C55.5 75.6 68.5 75.6 68.5 65.5C65.2 68.1 58.8 68.1 55.5 65.5Z"
                    fill={ink}
                    stroke={ink}
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M59.1 71.2C59.4 75.4 64.6 75.4 64.9 71.2Z"
                    fill="var(--gt-mascot-tongue)"
                  />
                </g>
                <g
                  ref={(node) => {
                    mouthRefs.current.howling = node;
                  }}
                  style={{ opacity: 0 }}
                  data-mascot-part="howling-mouth"
                >
                  <ellipse cx="62" cy="67.8" rx="4.6" ry="7.4" fill={ink} />
                  <ellipse
                    cx="62"
                    cy="71.3"
                    rx="2.3"
                    ry="1.8"
                    fill="var(--gt-mascot-tongue)"
                  />
                </g>
                <g
                  ref={(node) => {
                    mouthRefs.current.growling = node;
                  }}
                  style={{ opacity: 0 }}
                  data-mascot-part="growling-mouth"
                >
                  <path
                    d="M53.5 68C57 64.8 67 64.8 70.5 68C68.7 75.8 55.3 75.8 53.5 68Z"
                    fill={ink}
                    stroke={ink}
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M56.5 67.2L59.2 71L61.5 67.1L64 71L67.2 67.2"
                    fill="#ffffff"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </g>
                <g
                  ref={(node) => {
                    mouthRefs.current.neutral = node;
                  }}
                  style={{ opacity: 0 }}
                >
                  <path
                    d="M62 64.8C62 70 56.6 71 54 67.4"
                    fill="none"
                    stroke={ink}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M62 64.8C62 70 67.4 71 70 67.4"
                    fill="none"
                    stroke={ink}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </g>
                <g
                  ref={(node) => {
                    mouthRefs.current.anticipating = node;
                  }}
                  style={{ opacity: 0 }}
                >
                  <path
                    d="M62 64.8C62 69.2 57.2 69.8 54.8 67"
                    fill="none"
                    stroke={ink}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M62 64.8C62 69.2 66.8 69.8 69.2 67"
                    fill="none"
                    stroke={ink}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </g>
                <g
                  ref={(node) => {
                    mouthRefs.current.focused = node;
                  }}
                  style={{ opacity: 0 }}
                >
                  <path
                    d="M56 68H68"
                    fill="none"
                    stroke={ink}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </g>
                <g
                  ref={(node) => {
                    mouthRefs.current.pleased = node;
                  }}
                  style={{ opacity: 0 }}
                >
                  <path
                    d="M62 64.4C62 71 55.6 72.2 52.6 67.8"
                    fill="none"
                    stroke={ink}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M62 64.4C62 71 68.4 72.2 71.4 67.8"
                    fill="none"
                    stroke={ink}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </g>
                <g
                  ref={(node) => {
                    mouthRefs.current.surprised = node;
                  }}
                  style={{ opacity: 0 }}
                >
                  <ellipse cx="62" cy="69" rx="4.8" ry="6" fill={ink} />
                </g>
                <g
                  ref={(node) => {
                    mouthRefs.current.delighted = node;
                  }}
                  style={{ opacity: 0 }}
                >
                  <path
                    d="M55 67.6C55.6 76 68.4 76 69 67.6Z"
                    fill={ink}
                    stroke={ink}
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                  />
                </g>
              </g>
            </g>

            {Array.from({ length: SWEAT_COUNT }, (_, index) => (
              <g
                key={`sweat-${index}`}
                ref={(node) => {
                  sweatRefs.current[index] = node;
                }}
                style={{ opacity: 0 }}
              >
                <path
                  d="M0 -7C4 -2 5.5 1.2 5.5 4A5.5 5.5 0 0 1 -5.5 4C-5.5 1.2 -4 -2 0 -7Z"
                  fill="var(--gt-mascot-sweat)"
                  stroke={edge}
                  strokeWidth="1"
                />
              </g>
            ))}

            {/*
              Both arms are drawn over the body and re-pathed every frame: the
              shoulder end rides the chest, the wrist end sits wherever the hand
              was planted. The wider stroke under each one is its outline.
            */}
            <g>
              <path
                ref={leftArmEdgeRef}
                fill="none"
                stroke={edge}
                strokeWidth="12.6"
                strokeLinecap="round"
              />
              <path
                ref={leftArmRef}
                fill="none"
                stroke="url(#gtMascotBody)"
                strokeWidth="9.2"
                strokeLinecap="round"
              />
              {/* Palm resting flat on the bar. */}
              <g ref={leftPawRef}>
                <ellipse
                  rx="10.5"
                  ry="8.2"
                  transform="rotate(-6)"
                  fill="url(#gtMascotBody)"
                  stroke={edge}
                  strokeWidth="1.6"
                />
              </g>
            </g>

            <g>
              <path
                ref={rightArmEdgeRef}
                fill="none"
                stroke={edge}
                strokeWidth="12.6"
                strokeLinecap="round"
              />
              <path
                ref={rightArmRef}
                fill="none"
                stroke="url(#gtMascotBody)"
                strokeWidth="9.2"
                strokeLinecap="round"
              />
              {/* Palm cupped over the top of the knob; its fingers are in front. */}
              <g ref={rightPawRef}>
                <ellipse
                  rx="10.5"
                  ry="8.2"
                  transform="rotate(-22)"
                  fill="url(#gtMascotBody)"
                  stroke={edge}
                  strokeWidth="1.6"
                />
              </g>
            </g>

            {Array.from({ length: SPARK_COUNT }, (_, index) => (
              <g
                key={index}
                ref={(node) => {
                  sparkRefs.current[index] = node;
                }}
                style={{ opacity: 0 }}
              >
                <circle
                  r={index % 2 === 0 ? 3.4 : 2.4}
                  fill={
                    index % 3 === 0
                      ? "var(--gt-mascot-accent-deep)"
                      : "var(--gt-mascot-accent)"
                  }
                />
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/*
        Fingers only. The bar and the knob are painted over the mascot's body, so
        the part of each hand that has to sit *on* them lives in its own layer
        above the track — that is what turns a hand behind the knob into a hand
        holding it.
      */}
      <div className="gt-mascot-front" aria-hidden="true" style={veil}>
        <div ref={frontRef} className="gt-mascot-art">
          <svg
            width={ART.width}
            height={ART.height}
            viewBox={`0 0 ${ART.width} ${ART.height}`}
            focusable="false"
          >
            {/* Three fingers draped over the near edge of the bar. */}
            <g ref={restFingersRef} data-mascot-part="rest-fingers">
              <g stroke={edge} strokeWidth="5.6" strokeLinecap="round">
                <path d="M-7 2.5 -7.6 7.5" />
                <path d="M0 3.4 0 8.6" />
                <path d="M6.8 2.5 7.2 7.2" />
              </g>
              <g stroke={body} strokeWidth="3.6" strokeLinecap="round">
                <path d="M-7 2.5 -7.6 7.5" />
                <path d="M0 3.4 0 8.6" />
                <path d="M6.8 2.5 7.2 7.2" />
              </g>
            </g>

            {/*
              Thumb over the top of the knob, three fingers curled down its face.
              Authored for a 15-unit knob centred on the origin; the component
              sizes and turns the whole group to the real one.
            */}
            <g ref={gripFingersRef} data-mascot-part="grip-fingers">
              <g fill="none" stroke={edge} strokeWidth="5.6" strokeLinecap="round">
                <path d="M10 -10.5Q12.5 -7.5 11.5 -4.5" />
                <path d="M-9 -11.5Q-12 -8.5 -12 -5.5" />
                <path d="M-2.5 -13Q-5 -9 -4.5 -6" />
                <path d="M4 -12.5Q3 -8.5 4 -5.5" />
              </g>
              <g fill="none" stroke={body} strokeWidth="3.6" strokeLinecap="round">
                <path d="M10 -10.5Q12.5 -7.5 11.5 -4.5" />
                <path d="M-9 -11.5Q-12 -8.5 -12 -5.5" />
                <path d="M-2.5 -13Q-5 -9 -4.5 -6" />
                <path d="M4 -12.5Q3 -8.5 4 -5.5" />
              </g>
            </g>
          </svg>
        </div>
      </div>
    </>
  );
}

export const WarmupSliderMascot = memo(WarmupSliderMascotComponent);
