export const formatPrice = (price: number | string) => {
  const num = Number(price);
  return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};