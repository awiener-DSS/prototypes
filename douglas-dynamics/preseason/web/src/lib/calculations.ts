import type {
  CalculationAudit,
  CatalogKey,
  CategoryCalcAudit,
  LineCalcAudit,
  LineCalcStep,
  LineItem,
  OrderCalculationResult,
  OrderSummary,
  Product,
  ProgramType,
  QualificationAudit,
  VolumeTier,
} from '../types';
import configData from '../data/config.json';
import { EXCEL_WORKBOOK, sheetForKey, unitTypeLabel, VOLUME_SHEET } from './excelRefs';

const STANDARD_DISCOUNT = configData.config.standardDiscount;
const MOUNT_MAX_RATIO = configData.config.mountMaxRatio;

type VolumeModel = 'netPercent' | 'listPercent' | 'countNetPercent' | 'dollarNetPercent';

interface CategoryMeta {
  label: string;
  volumeKey?: string;
  volumeModel?: VolumeModel;
  countsAsParts?: boolean;
  isPlow?: boolean;
  isBladeMount?: boolean;
}

const TRUCK_META: Record<string, CategoryMeta> = {
  blades: { label: 'Blades, Attachments & Mounts', volumeKey: 'snowplows', volumeModel: 'netPercent', isBladeMount: true },
  electrical: { label: 'Controls, Harnesses & Modules', volumeKey: 'snowplows', volumeModel: 'netPercent' },
  hopper: { label: 'Hopper Spreaders & Pre-Wet', volumeKey: 'hopper', volumeModel: 'listPercent' },
  tailgate: { label: 'Tailgate Spreaders', volumeKey: 'tailgate', volumeModel: 'listPercent' },
  cuttingEdges: { label: 'Cutting Edges & Backdrag Edges', volumeKey: 'cuttingEdges', volumeModel: 'countNetPercent' },
  hydraulic: { label: 'Hydraulic Fluid & Grease', volumeKey: 'hydraulic', volumeModel: 'dollarNetPercent' },
  plowAccessories: { label: 'Plow Accessories', countsAsParts: true },
  hopperAccessories: { label: 'Hopper Accessories', countsAsParts: true },
  sidewalk: { label: 'Sidewalk Products', countsAsParts: true },
  tailgateAccessories: { label: 'Tailgate & Sidewalk Accessories', countsAsParts: true },
  serviceParts: { label: 'Service Parts', countsAsParts: true },
};

const NONTRUCK_META: Record<string, CategoryMeta> = {
  utvPlows: { label: 'UTV Plows', volumeKey: 'snowplows', volumeModel: 'netPercent', isPlow: true },
  subcompactPlows: { label: 'Subcompact Tractor Plows', volumeKey: 'snowplows', volumeModel: 'netPercent', isPlow: true },
  pusherPlows: { label: 'Pusher Plows', volumeKey: 'snowplows', volumeModel: 'netPercent', isPlow: true },
  tractorSkidSteerPlows: { label: 'Tractor & Skid-Steer Plows', volumeKey: 'snowplows', volumeModel: 'netPercent', isPlow: true },
  hopper: { label: 'Hopper & Drop Spreaders', volumeKey: 'hopper', volumeModel: 'listPercent' },
  tailgate: { label: 'Tailgate Spreaders', volumeKey: 'tailgate', volumeModel: 'listPercent' },
  rotaryBroom: { label: 'Rotary Broom', countsAsParts: true },
  cuttingEdges: { label: 'Cutting Edges & Backdrag Edges', volumeKey: 'cuttingEdges', volumeModel: 'countNetPercent' },
  hydraulic: { label: 'Hydraulic Fluid & Grease', volumeKey: 'hydraulic', volumeModel: 'dollarNetPercent' },
  plowAccessories: { label: 'Snowplow Accessories', countsAsParts: true },
  hopperAccessories: { label: 'Hopper & Drop Accessories', countsAsParts: true },
  sidewalk: { label: 'Sidewalk Products', countsAsParts: true },
  tailgateAccessories: { label: 'Tailgate & Sidewalk Accessories', countsAsParts: true },
  serviceParts: { label: 'Service Parts', countsAsParts: true },
};

const HYDRAULIC_TIERS: VolumeTier[] = [
  { min: 672, max: null, discount: 0.11, label: '672+ (11%)' },
  { min: 336, max: 671, discount: 0.09, label: '336-671 (9%)' },
  { min: 168, max: 335, discount: 0.06, label: '168-335 (6%)' },
];

function getVolumeRate(units: number, tiers: VolumeTier[]): { rate: number; label: string; tierRef: string } {
  for (let i = tiers.length - 1; i >= 0; i--) {
    const tier = tiers[i];
    if (units >= tier.min && (tier.max === null || units <= tier.max)) {
      return {
        rate: tier.discount,
        label: tier.label,
        tierRef: `P${tier.min}${tier.max ? `–${tier.max}` : '+'}`,
      };
    }
  }
  return { rate: 0, label: 'No volume discount', tierRef: '—' };
}

function findProduct(catalog: Record<string, Product[]>, key: string, part: string): Product | undefined {
  return catalog[key]?.find((p) => p.part === part);
}

function buildLineAudit(
  item: LineItem,
  product: Product,
  rowHint: number,
): LineCalcAudit {
  const sheet = sheetForKey(item.catalogKey);
  const row = `~${rowHint}`;
  const listPrice = product.listPrice;
  const netUnit = listPrice * (1 - STANDARD_DISCOUNT);
  const extendedNet = item.qty * netUnit;
  const unitEquiv = product.unitEquiv ?? 0;
  const unitContrib = item.qty * unitEquiv;

  const steps: LineCalcStep[] = [
    {
      label: 'List Price',
      excelRef: `${sheet}!P${row}`,
      formula: `P${row} = ${listPrice}`,
      value: listPrice,
    },
    {
      label: 'Net Unit Price',
      excelRef: `${sheet}!Q${row}`,
      formula: `Q${row} = P${row} × (1 − $P$5) = ${listPrice} × ${1 - STANDARD_DISCOUNT}`,
      value: netUnit,
    },
    {
      label: 'Extended Net',
      excelRef: `${sheet}!R${row}`,
      formula: `R${row} = A${row} × Q${row} = ${item.qty} × ${netUnit.toFixed(2)}`,
      value: extendedNet,
    },
  ];

  if (unitEquiv > 0) {
    steps.push(
      {
        label: 'Unit Equivalent',
        excelRef: `${sheet}!W${row}`,
        formula: `W${row} = ${unitEquiv} (${unitTypeLabel(product.type)})`,
        value: unitEquiv,
      },
      {
        label: 'Unit Contribution',
        excelRef: `${sheet}!V${row}`,
        formula: `V${row} = W${row} × A${row} = ${unitEquiv} × ${item.qty}`,
        value: unitContrib,
      },
    );
  }

  return {
    part: item.part,
    description: product.description,
    catalogKey: item.catalogKey,
    excelSheet: sheet,
    qty: item.qty,
    steps,
  };
}

function snowplowVolumeFormula(plowUnits: number, net: number): LineCalcStep[] {
  const tiers = configData.volumeRules.snowplows;
  const { rate, label, tierRef } = getVolumeRate(plowUnits, tiers);
  const savings = net * rate;
  return [
    {
      label: 'Plow Units (P11)',
      excelRef: 'Blades, Attachments, Mounts!P11',
      formula: 'P11 = SUM(V rows) — total snowplow wholegood units',
      value: plowUnits,
    },
    {
      label: 'Volume Tier',
      excelRef: `Blades!P7:P9 / R7:R9`,
      formula: `IF(P11≥75, tier lookup) → ${label} (${tierRef})`,
      value: label,
    },
    {
      label: 'Volume Rate',
      excelRef: 'Blades!R7:R9',
      formula: `Rate = ${rate} (${(rate * 100).toFixed(0)}% of net)`,
      value: rate,
    },
    {
      label: 'Volume Savings (T14)',
      excelRef: 'Blades!T14',
      formula: `T14 = Rate × R13 = ${rate} × ${net.toFixed(0)}`,
      value: savings,
    },
    {
      label: 'Net Less Volume (L8)',
      excelRef: 'Truck Final Summary!L8',
      formula: `L8 = H8 − J8 = ${net.toFixed(0)} − ${savings.toFixed(0)}`,
      value: net - savings,
    },
  ];
}

function hopperVolumeFormula(hopperUnits: number, list: number, net: number): LineCalcStep[] {
  const { rate, label } = getVolumeRate(hopperUnits, configData.volumeRules.hopper);
  if (hopperUnits < 5) {
    return [
      {
        label: 'Hopper Count (P9)',
        excelRef: 'Hopper Spreaders & Pre-Wet!P9',
        formula: 'P9 = SUM(hopper qty)',
        value: hopperUnits,
      },
      {
        label: 'Volume Tier',
        excelRef: 'Hopper!P5:P7',
        formula: 'Under 5 units — no volume tier',
        value: 'Under 5 units',
      },
      {
        label: 'Net Less Volume',
        excelRef: 'Hopper!R13',
        formula: 'R13 = R11 (standard net only)',
        value: net,
      },
    ];
  }
  const netLess = list * (1 - rate);
  const savings = net - netLess;
  return [
    {
      label: 'Hopper Count (P9)',
      excelRef: 'Hopper Spreaders & Pre-Wet!P9',
      formula: 'P9 = SUM(hopper qty)',
      value: hopperUnits,
    },
    {
      label: 'Volume Tier',
      excelRef: 'Hopper!P5:P7 / R5:R7',
      formula: `Tier: ${label} → R5/R6/R7 = ${rate}`,
      value: label,
    },
    {
      label: 'Net Less Volume (T12)',
      excelRef: 'Hopper!T12',
      formula: `T12 = (1 − R5) × List Total = ${1 - rate} × ${list.toFixed(0)}`,
      value: netLess,
    },
    {
      label: 'Volume Savings (R12)',
      excelRef: 'Hopper!R12',
      formula: `R12 = R11 − R13 = ${net.toFixed(0)} − ${netLess.toFixed(0)}`,
      value: savings,
    },
  ];
}

function tailgateVolumeFormula(tailgateUnits: number, list: number, net: number): LineCalcStep[] {
  const { rate, label } = getVolumeRate(tailgateUnits, configData.volumeRules.tailgate);
  if (tailgateUnits < 10) {
    return [
      {
        label: 'Tailgate Count (P8)',
        excelRef: 'Tailgate Spreaders!P8',
        formula: 'P8 = SUM(tailgate qty)',
        value: tailgateUnits,
      },
      {
        label: 'Volume Tier',
        excelRef: 'Tailgate!P5:P6',
        formula: 'Under 10 units — no volume tier',
        value: 'Under 10 units',
      },
      {
        label: 'Net Less Volume',
        excelRef: 'Tailgate!R12',
        formula: 'R12 = R10 (standard net only)',
        value: net,
      },
    ];
  }
  const netLess = list * (1 - rate);
  const savings = net - netLess;
  return [
    {
      label: 'Tailgate Count (P8)',
      excelRef: 'Tailgate Spreaders!P8',
      formula: 'P8 = SUM(tailgate qty)',
      value: tailgateUnits,
    },
    {
      label: 'Volume Tier',
      excelRef: 'Tailgate!P5:P6 / R5:R6',
      formula: `Tier: ${label}`,
      value: label,
    },
    {
      label: 'Net Less Volume (T12)',
      excelRef: 'Tailgate!T12',
      formula: `T12 = (1 − R5) × List Total = ${1 - rate} × ${list.toFixed(0)}`,
      value: netLess,
    },
    {
      label: 'Volume Savings (R11)',
      excelRef: 'Tailgate!R11',
      formula: `R11 = R10 − R12`,
      value: savings,
    },
  ];
}

export function calculateOrderFull(
  catalog: Record<string, Product[]>,
  lineItems: LineItem[],
  program: ProgramType,
): OrderCalculationResult {
  const meta = program === 'truck' ? TRUCK_META : NONTRUCK_META;
  const freight = program === 'truck' ? configData.freight : configData.nonTruck.freight;

  const byCategory = new Map<string, { net: number; list: number; count: number; units: number }>();
  for (const key of Object.keys(meta)) {
    byCategory.set(key, { net: 0, list: 0, count: 0, units: 0 });
  }

  let bladeEquiv = 0;
  let attachmentEquiv = 0;
  let mountEquiv = 0;
  let plowUnits = 0;
  let rowHint = 23;
  const lineAudits: LineCalcAudit[] = [];

  for (const item of lineItems) {
    if (item.qty <= 0) continue;
    const product = findProduct(catalog, item.catalogKey, item.part);
    if (!product) continue;

    lineAudits.push(buildLineAudit(item, product, rowHint));
    rowHint++;

    const net = item.qty * product.listPrice * (1 - STANDARD_DISCOUNT);
    const list = item.qty * product.listPrice;
    const bucket = byCategory.get(item.catalogKey);
    if (!bucket) continue;

    bucket.net += net;
    bucket.list += list;
    bucket.count += item.qty;
    if (product.unitEquiv) bucket.units += item.qty * product.unitEquiv;

    const catMeta = meta[item.catalogKey];
    if (catMeta?.isPlow) {
      plowUnits += item.qty * (product.unitEquiv ?? 1);
    } else if (catMeta?.isBladeMount) {
      plowUnits += item.qty * (product.unitEquiv ?? 0);
      const type = product.type ?? '';
      if (type === 'PL') bladeEquiv += item.qty * (product.unitEquiv ?? 0.25);
      else if (type === 'AT' || type === 'CH') attachmentEquiv += item.qty * (product.unitEquiv ?? 0.5);
      else if (type === 'MT') mountEquiv += item.qty * (product.unitEquiv ?? 0.25);
    }
  }

  if (program === 'truck') {
    plowUnits = byCategory.get('blades')?.units ?? 0;
  }

  const plowVolume = getVolumeRate(plowUnits, configData.volumeRules.snowplows);
  const hopperBucket = byCategory.get('hopper');
  const hopperUnits = hopperBucket?.count ?? 0;
  const hopperVolume = getVolumeRate(hopperUnits, configData.volumeRules.hopper);
  const tailgateBucket = byCategory.get('tailgate');
  const tailgateUnits = tailgateBucket?.count ?? 0;
  const tailgateVolume = getVolumeRate(tailgateUnits, configData.volumeRules.tailgate);

  const plowBase = bladeEquiv + attachmentEquiv;
  const mountRatio = plowBase > 0 ? mountEquiv / plowBase : 0;

  const categoryAudits: CategoryCalcAudit[] = [];
  const categories = Object.keys(meta)
    .map((key) => {
      const catMeta = meta[key];
      const bucket = byCategory.get(key)!;
      if (bucket.net === 0 && bucket.count === 0) return null;

      let volumeRate = 0;
      let volumeLabel = 'No volume discount';
      let volumeSavings = 0;
      let netLessVolume = bucket.net;
      let volumeSteps: LineCalcStep[] = [];

      if (catMeta.volumeModel === 'netPercent' && catMeta.volumeKey === 'snowplows') {
        volumeRate = plowVolume.rate;
        volumeLabel = plowVolume.label;
        volumeSavings = bucket.net * volumeRate;
        netLessVolume = bucket.net - volumeSavings;
        volumeSteps = snowplowVolumeFormula(plowUnits, bucket.net);
      } else if (catMeta.volumeModel === 'listPercent' && key === 'hopper') {
        volumeRate = hopperVolume.rate;
        volumeLabel = hopperVolume.label;
        volumeSteps = hopperVolumeFormula(hopperUnits, bucket.list, bucket.net);
        if (hopperUnits >= 5) {
          netLessVolume = bucket.list * (1 - volumeRate);
          volumeSavings = bucket.net - netLessVolume;
        } else {
          volumeLabel = 'Under 5 units';
        }
      } else if (catMeta.volumeModel === 'listPercent' && key === 'tailgate') {
        volumeRate = tailgateVolume.rate;
        volumeLabel = tailgateVolume.label;
        volumeSteps = tailgateVolumeFormula(tailgateUnits, bucket.list, bucket.net);
        if (tailgateUnits >= 10) {
          netLessVolume = bucket.list * (1 - volumeRate);
          volumeSavings = bucket.net - netLessVolume;
        } else {
          volumeLabel = 'Under 10 units';
        }
      } else if (catMeta.volumeModel === 'countNetPercent') {
        const cuttingVolume = getVolumeRate(bucket.count, configData.volumeRules.cuttingEdges);
        volumeRate = cuttingVolume.rate;
        volumeLabel = cuttingVolume.label;
        volumeSavings = bucket.net * volumeRate;
        netLessVolume = bucket.net - volumeSavings;
        volumeSteps = [
          {
            label: 'Edge Count (P8)',
            excelRef: 'Cutting Edges & Backdrag Edges!P8',
            formula: 'P8 = SUM(qty)',
            value: bucket.count,
          },
          {
            label: 'Volume Tier',
            excelRef: 'Cutting Edges!P5:P6 / R5:R6',
            formula: `Tier: ${volumeLabel} → ${(volumeRate * 100).toFixed(0)}% of net`,
            value: volumeLabel,
          },
          {
            label: 'Volume Savings',
            excelRef: 'Cutting Edges!R11',
            formula: `R11 = R10 × ${volumeRate}`,
            value: volumeSavings,
          },
        ];
      } else if (catMeta.volumeModel === 'dollarNetPercent') {
        const hydraulicVolume = getVolumeRate(bucket.net, HYDRAULIC_TIERS);
        volumeRate = hydraulicVolume.rate;
        volumeLabel = hydraulicVolume.label;
        volumeSavings = bucket.net * volumeRate;
        netLessVolume = bucket.net - volumeSavings;
        volumeSteps = [
          {
            label: 'Category Net (R13)',
            excelRef: 'Hydraulic Fluid & Grease!R13',
            formula: 'SUM(extended net)',
            value: bucket.net,
          },
          {
            label: 'Volume Tier (dollar)',
            excelRef: 'Hydraulic!P11:P13',
            formula: `Tier: ${volumeLabel}`,
            value: volumeLabel,
          },
          {
            label: 'Volume Savings',
            excelRef: 'Hydraulic!R26',
            formula: `R26 = R25 × ${volumeRate}`,
            value: volumeSavings,
          },
        ];
      } else if (catMeta.countsAsParts) {
        volumeSteps = [
          {
            label: 'Parts & Accessories',
            excelRef: sheetForKey(key as CatalogKey),
            formula: 'No volume discount — net = extended total',
            value: bucket.net,
          },
        ];
      }

      categoryAudits.push({
        key,
        label: catMeta.label,
        excelSheet: sheetForKey(key as CatalogKey),
        totalList: bucket.list,
        totalNet: bucket.net,
        itemCount: bucket.count,
        unitCount: catMeta.isBladeMount ? plowUnits : bucket.count,
        volumeSteps,
        volumeSavings: Math.max(0, volumeSavings),
        netLessVolume: Math.max(0, netLessVolume),
      });

      return {
        key,
        label: catMeta.label,
        units: catMeta.isBladeMount ? plowUnits : bucket.count,
        net: bucket.net,
        volumeSavings: Math.max(0, volumeSavings),
        netLessVolume: Math.max(0, netLessVolume),
        volumeRate,
        volumeLabel,
      };
    })
    .filter(Boolean) as OrderSummary['categories'];

  const partsDollars = Object.keys(meta)
    .filter((k) => meta[k].countsAsParts)
    .reduce((sum, k) => sum + (byCategory.get(k)?.net ?? 0), 0);

  const totalProgramUnits = plowUnits + hopperUnits + tailgateUnits / 2;

  const qualifications: QualificationAudit[] = [
    {
      label: 'Preseason Qualification',
      excelRef: `${VOLUME_SHEET}!I11`,
      formula: 'IF(AND(I9≥P57, I10≥P59), "YES", "NO")',
      threshold: `≥${freight.minUnits} units AND ≥$${freight.minPartsDollars.toLocaleString()} P&A`,
      actual: `${totalProgramUnits.toFixed(1)} units, $${partsDollars.toFixed(0)} P&A`,
      result: totalProgramUnits >= freight.minUnits && partsDollars >= freight.minPartsDollars,
    },
    {
      label: 'Total Program Units',
      excelRef: `${VOLUME_SHEET}!I9`,
      formula: 'I9 = P9 + P10 + (P11 / 2)',
      threshold: '—',
      actual: `${totalProgramUnits.toFixed(1)} (= ${plowUnits} plows + ${hopperUnits} hoppers + ${tailgateUnits}/2 tailgates)`,
      result: true,
    },
  ];

  if (program === 'truck') {
    qualifications.push(
      {
        label: 'Free Freight',
        excelRef: `${VOLUME_SHEET}!I12`,
        formula: 'IF(AND(I9≥P58, I10≥P59), "YES", "NO")',
        threshold: `≥${configData.freight.freeFreightUnits} units AND ≥$${freight.minPartsDollars.toLocaleString()} P&A`,
        actual: `${totalProgramUnits.toFixed(1)} units`,
        result:
          totalProgramUnits >= configData.freight.freeFreightUnits &&
          partsDollars >= freight.minPartsDollars,
      },
      {
        label: '50% Freight',
        excelRef: `${VOLUME_SHEET}!I13`,
        formula: 'IF(AND(I9≥P57, I9<P58, I10≥P59), "YES", "NO")',
        threshold: `${freight.minUnits}–${configData.freight.freeFreightUnits - 1} units`,
        actual: `${totalProgramUnits.toFixed(1)} units`,
        result:
          totalProgramUnits >= freight.minUnits &&
          totalProgramUnits < configData.freight.freeFreightUnits &&
          partsDollars >= freight.minPartsDollars,
      },
    );
  }

  const grandTotal = categories.reduce((s, c) => s + c.net, 0);
  const grandVolumeSavings = categories.reduce((s, c) => s + c.volumeSavings, 0);
  const grandNetLessVolume = categories.reduce((s, c) => s + c.netLessVolume, 0);

  const summary: OrderSummary = {
    plowUnits,
    bladeUnits: bladeEquiv,
    attachmentUnits: attachmentEquiv,
    mountUnits: mountEquiv,
    mountRatioWarning: program === 'truck' && mountRatio > MOUNT_MAX_RATIO,
    hopperUnits,
    tailgateUnits,
    totalProgramUnits,
    partsDollars,
    qualifiesPreseason: totalProgramUnits >= freight.minUnits && partsDollars >= freight.minPartsDollars,
    qualifiesFreeFreight:
      program === 'truck' &&
      totalProgramUnits >= configData.freight.freeFreightUnits &&
      partsDollars >= freight.minPartsDollars,
    qualifiesHalfFreight:
      program === 'truck' &&
      totalProgramUnits >= freight.minUnits &&
      totalProgramUnits < configData.freight.freeFreightUnits &&
      partsDollars >= freight.minPartsDollars,
    categories,
    grandTotal,
    grandVolumeSavings,
    grandNetLessVolume,
  };

  const audit: CalculationAudit = {
    program,
    excelWorkbook: EXCEL_WORKBOOK,
    constants: [
      {
        label: 'Standard Discount',
        excelRef: 'Blades!$P$5',
        formula: `P5 = ${STANDARD_DISCOUNT} (${STANDARD_DISCOUNT * 100}% off list)`,
        value: STANDARD_DISCOUNT,
      },
      {
        label: 'Mount Max Ratio',
        excelRef: 'Blades!T11',
        formula: `T11 = T8/T10 — warn if > ${MOUNT_MAX_RATIO}`,
        value: MOUNT_MAX_RATIO,
      },
      {
        label: 'Snowplow Vol Tiers',
        excelRef: 'Blades!P7:P9 / R7:R9',
        formula: '75→1%, 150→2%, 250→3% of net',
        value: 'See volume lookup',
      },
      {
        label: 'Hopper Vol Tiers',
        excelRef: 'Hopper!P5:P7 / R5:R7',
        formula: '5→50%, 35→53%, 75→55% off list',
        value: 'See volume lookup',
      },
    ],
    lineItems: lineAudits,
    unitBreakdown: [
      { label: 'Blade Units', excelRef: 'Blades!T6', formula: 'SUM(blade V rows)', value: bladeEquiv },
      { label: 'Attachment Units', excelRef: 'Blades!T7', formula: 'SUM(attachment V rows)', value: attachmentEquiv },
      { label: 'Mount Units', excelRef: 'Blades!T8', formula: 'SUM(mount V rows)', value: mountEquiv },
      { label: 'Total Plow Units (P11)', excelRef: 'Blades!P11=T12', formula: 'SUM(all V rows)', value: plowUnits },
      { label: 'Hopper Units', excelRef: 'Hopper!P9', formula: 'SUM(hopper qty)', value: hopperUnits },
      { label: 'Tailgate Units', excelRef: 'Tailgate!P8', formula: 'SUM(tailgate qty)', value: tailgateUnits },
      {
        label: 'Program Units',
        excelRef: `${VOLUME_SHEET}!I9`,
        formula: `I9 = ${plowUnits} + ${hopperUnits} + (${tailgateUnits}/2)`,
        value: totalProgramUnits,
      },
    ],
    mountRatio: [
      {
        label: 'Mount / Plow Ratio',
        excelRef: 'Blades!T11',
        formula: `T11 = T8 / (T6+T7) = ${mountEquiv} / ${plowBase}`,
        value: mountRatio,
      },
      {
        label: '150% Warning',
        excelRef: 'Blades!G3',
        formula: `IF(T11 > 1.5, "Over 150% of Mounts", "")`,
        value: mountRatio > MOUNT_MAX_RATIO ? 'WARNING' : 'OK',
      },
    ],
    volumeTierLookup: configData.volumeRules.snowplows.map((t) => ({
      label: `Snowplows ${t.label}`,
      excelRef: 'Blades!P7:R9',
      formula: `${t.min}${t.max ? `–${t.max}` : '+'} units → ${(t.discount * 100).toFixed(0)}% of net`,
      value: t.discount,
    })),
    categories: categoryAudits,
    qualifications,
    totals: [
      {
        label: 'Grand Net (R13 sum)',
        excelRef: 'Truck Final Summary!H10',
        formula: 'SUM(category net)',
        value: grandTotal,
      },
      {
        label: 'Grand Volume Savings',
        excelRef: 'Truck Final Summary!J10',
        formula: 'SUM(category volume savings)',
        value: grandVolumeSavings,
      },
      {
        label: 'Net Less Volume',
        excelRef: 'Truck Final Summary!L30',
        formula: 'Grand Net − Volume Savings',
        value: grandNetLessVolume,
      },
    ],
  };

  return { summary, audit };
}

export function calculateOrder(
  catalog: Record<string, Product[]>,
  lineItems: LineItem[],
  program: ProgramType,
): OrderSummary {
  return calculateOrderFull(catalog, lineItems, program).summary;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value: number, decimals = 1): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function getProduct(catalog: Record<string, Product[]>, key: CatalogKey, part: string): Product | undefined {
  return findProduct(catalog, key, part);
}

export { STANDARD_DISCOUNT, TRUCK_META, NONTRUCK_META };
