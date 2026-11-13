import * as THREE from 'three';
import { HOME_VIEW } from '../Camera';
import { EVENTS, emit, type ActiveDetail } from '../events';
import { getScreenGeo } from '../utils/screenGeo';
import FlyMode, { type FlyConfig, type FlyModeOptions } from './FlyMode';

/** Analysis section 8.3. */
const DISTANCE = 2.1; // times the screen's bounding-box diagonal
const UP = 0.55;
const FOV = 30;
const ENTER_MS = 1800;
const EXIT_MS = 1400;

function poseFor(screen: THREE.Mesh): FlyConfig {
  const geo = getScreenGeo(screen, HOME_VIEW.target);
  const position = geo.center.clone().addScaledVector(geo.normal, geo.size.length() * DISTANCE);
  position.y += UP;
  return { position, target: geo.center, fov: FOV, enterMs: ENTER_MS, exitMs: EXIT_MS };
}

/**
 * Clicking the laptop (analysis section 8.3): the camera flies to the laptop
 * screen and the HTML panel opens. `kai:suite {active}` is sent with `true`
 * when the camera arrives and `false` when it starts to leave. Leaves on
 * `Esc`, a click on the room, or `kai:suite-close` (the panel's button).
 */
export default class SuiteMode extends FlyMode {
  constructor(options: FlyModeOptions, screen: THREE.Mesh) {
    super(options, poseFor(screen));
    window.addEventListener(EVENTS.macbookActivate, this.onActivate);
    window.addEventListener(EVENTS.suiteClose, this.onClose);
  }

  protected onArrive(): void {
    this.send(true);
  }

  protected onExit(): void {
    this.send(false);
  }

  private send(active: boolean): void {
    const detail: ActiveDetail = { active };
    emit(EVENTS.suite, detail);
  }

  private onActivate = (): void => this.enter();
  private onClose = (): void => this.exit();

  destroy(): void {
    super.destroy();
    window.removeEventListener(EVENTS.macbookActivate, this.onActivate);
    window.removeEventListener(EVENTS.suiteClose, this.onClose);
  }
}
