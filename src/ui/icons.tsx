import {
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, SlidersHorizontal, Landmark, Wallet, Banknote, CreditCard,
  Utensils, Car, ShoppingBag, Receipt, Heart, BookOpen, Ticket, Repeat, Tag, Coins, BriefcaseBusiness, Gift,
} from 'lucide-react';

export const transactionIcons = { INCOME: ArrowDownLeft, EXPENSE: ArrowUpRight, TRANSFER: ArrowLeftRight, ADJUSTMENT: SlidersHorizontal };
export const accountIcons = { BANK: Landmark, EWALLET: CreditCard, CASH: Banknote, OTHER: Wallet };
export const categoryIcons = { utensils: Utensils, car: Car, bag: ShoppingBag, receipt: Receipt, heart: Heart, book: BookOpen,
  ticket: Ticket, repeat: Repeat, tag: Tag, wallet: Wallet, coins: Coins, briefcase: BriefcaseBusiness, gift: Gift,
  bank: Landmark, cash: Banknote, card: CreditCard };
export function customIcon(icon: string | null | undefined) {
  return categoryIcons[icon as keyof typeof categoryIcons];
}
