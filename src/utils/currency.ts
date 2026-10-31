export const round2 = (val: number): number => {
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

export const isZero = (val: number): boolean => {
  return Math.abs(round2(val)) < 0.005;
};

export const formatAmount = (val: number, symbol = '$'): string => {
  const rounded = round2(Math.abs(val));
  return `${symbol}${rounded.toFixed(2)}`;
};

export const formatBalance = (val: number, symbol = '$') => {
  const rounded = round2(val);
  if (isZero(rounded)) {
    return {
      formatted: `${symbol}0.00`,
      signedFormatted: `${symbol}0.00`,
      isPositive: false,
      isNegative: false,
      isZero: true,
      text: 'settled up',
    };
  }

  const absFormatted = formatAmount(rounded, symbol);

  if (rounded > 0) {
    return {
      formatted: absFormatted,
      signedFormatted: `+${absFormatted}`,
      isPositive: true,
      isNegative: false,
      isZero: false,
      text: `owed ${absFormatted}`,
    };
  }

  return {
    formatted: absFormatted,
    signedFormatted: `-${absFormatted}`,
    isPositive: false,
    isNegative: true,
    isZero: false,
    text: `owes ${absFormatted}`,
  };
};
