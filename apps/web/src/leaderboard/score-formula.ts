/** The formula version the sentence below describes — `apps/api/src/ranking/score.calculator.ts`. */
const DESCRIBED_VERSION = 'v1';

const DESCRIBED =
  'Điểm tổng hợp v1: 0.40 × Lợi nhuận + 0.20 × Tỷ lệ thắng − 0.30 × Drawdown tối đa' +
  ' + 0.10 × (Sharpe / 3), rồi nhân hệ số tin cậy min(1, √(Số lệnh / 20))' +
  ' — dưới 20 lệnh thì điểm bị chiết khấu vì quá ít lệnh để tin.';

/**
 * Every entry carries the version it was scored with, so a formula that moved on says
 * so instead of letting this sentence quietly describe arithmetic nobody runs any more.
 */
export function scoreTooltip(version: string | undefined): string {
  if (version && version !== DESCRIBED_VERSION) {
    return `Điểm chấm bằng công thức ${version}. Mô tả ở đây viết cho ${DESCRIBED_VERSION} nên không còn khớp — xem docs/decisions/0036.`;
  }
  return DESCRIBED;
}
