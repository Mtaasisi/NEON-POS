/**
 * Enhanced Message Personalization
 * Supports advanced dynamic variables for customer data
 */

import { supabase } from '../../../lib/supabaseClient';

interface CustomerData {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  total_spent?: number;
  last_purchase_date?: string;
  last_purchase_amount?: number;
  favorite_category?: string;
  total_orders?: number;
  days_since_last_order?: number;
}

/**
 * Get customer data from database
 */
async function getCustomerData(phone: string): Promise<CustomerData | null> {
  try {
    // Find customer by phone
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, phone, email')
      .or(`phone.eq.${phone},whatsapp.eq.${phone}`)
      .single();

    if (!customer) return null;

    // Get purchase history
    const { data: orders } = await supabase
      .from('orders')
      .select('total, created_at, items')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(100);

    const totalSpent = orders?.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0) || 0;
    const totalOrders = orders?.length || 0;
    const lastOrder = orders?.[0];
    const lastPurchaseDate = lastOrder?.created_at;
    const lastPurchaseAmount = lastOrder ? parseFloat(lastOrder.total) || 0 : 0;

    // Calculate days since last order
    const daysSinceLastOrder = lastPurchaseDate
      ? Math.floor((Date.now() - new Date(lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Get favorite category from order items
    const categoryCounts: Record<string, number> = {};
    orders?.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const category = item.category || item.product_category || 'Other';
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
      }
    });
    const favoriteCategory = Object.keys(categoryCounts).reduce((a, b) => 
      categoryCounts[a] > categoryCounts[b] ? a : b, 'General'
    );

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      total_spent: totalSpent,
      last_purchase_date: lastPurchaseDate,
      last_purchase_amount: lastPurchaseAmount,
      favorite_category: favoriteCategory,
      total_orders: totalOrders,
      days_since_last_order: daysSinceLastOrder
    };
  } catch (error) {
    console.error('Error fetching customer data:', error);
    return null;
  }
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS'
  }).format(amount);
}

/**
 * Format date
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get greeting based on time of day
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Generate unique content (emoji, invisible text, or random characters)
 * This helps make each message unique to avoid spam detection
 */
function generateUniqueContent(): string {
  const options = [
    // Random emoji
    () => {
      const emojis = ['✨', '🌟', '💫', '⭐', '🎉', '🎊', '💎', '🔥', '💯', '🎯', '🚀', '💪', '👍', '👏', '🙌', '🤝', '💝', '🎁', '🎈', '🏆'];
      return emojis[Math.floor(Math.random() * emojis.length)];
    },
    // Invisible zero-width characters
    () => {
      const invisibleChars = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
      return invisibleChars[Math.floor(Math.random() * invisibleChars.length)];
    },
    // Random small emoji
    () => {
      const smallEmojis = ['•', '▪', '▫', '◦', '▪', '▫'];
      return smallEmojis[Math.floor(Math.random() * smallEmojis.length)];
    },
    // Empty string (no visible change)
    () => ''
  ];
  
  // Randomly choose one option
  const selectedOption = options[Math.floor(Math.random() * options.length)];
  return selectedOption();
}

/**
 * Personalize message with all available variables
 */
export async function personalizeMessage(
  message: string,
  phone: string,
  customerName?: string
): Promise<string> {
  if (!message.includes('{')) return message;

  let personalized = message;
  const customer = await getCustomerData(phone);

  // Basic variables (always available)
  personalized = personalized.replace(/{name}/g, customerName || customer?.name || 'Valued Customer');
  personalized = personalized.replace(/{phone}/g, phone);
  personalized = personalized.replace(/{greeting}/g, getGreeting());
  personalized = personalized.replace(/{date}/g, new Date().toLocaleDateString());
  personalized = personalized.replace(/{time}/g, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  personalized = personalized.replace(/{day}/g, new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  personalized = personalized.replace(/{month}/g, new Date().toLocaleDateString('en-US', { month: 'long' }));
  
  // Unique content generator - generates random emoji/invisible text for each message
  // Replace each occurrence with a new unique value (case-insensitive)
  personalized = personalized.replace(/\{unique\}/gi, () => generateUniqueContent());

  // Customer data variables (if customer found)
  if (customer) {
    personalized = personalized.replace(/{totalSpent}/g, formatCurrency(customer.total_spent || 0));
    personalized = personalized.replace(/{lastPurchase}/g, customer.last_purchase_date 
      ? formatDate(customer.last_purchase_date) 
      : 'No purchases yet');
    personalized = personalized.replace(/{lastPurchaseAmount}/g, customer.last_purchase_amount 
      ? formatCurrency(customer.last_purchase_amount) 
      : 'N/A');
    personalized = personalized.replace(/{favoriteCategory}/g, customer.favorite_category || 'General');
    personalized = personalized.replace(/{totalOrders}/g, String(customer.total_orders || 0));
    personalized = personalized.replace(/{daysSinceLastOrder}/g, customer.days_since_last_order !== null 
      ? String(customer.days_since_last_order) 
      : 'N/A');
  } else {
    // Default values if customer not found
    personalized = personalized.replace(/{totalSpent}/g, 'N/A');
    personalized = personalized.replace(/{lastPurchase}/g, 'N/A');
    personalized = personalized.replace(/{lastPurchaseAmount}/g, 'N/A');
    personalized = personalized.replace(/{favoriteCategory}/g, 'General');
    personalized = personalized.replace(/{totalOrders}/g, '0');
    personalized = personalized.replace(/{daysSinceLastOrder}/g, 'N/A');
  }

  return personalized;
}

/**
 * Get list of all available variables
 */
export function getAvailableVariables(): Array<{variable: string, description: string, example: string}> {
  return [
    { variable: '{name}', description: 'Customer name', example: 'John Doe' },
    { variable: '{phone}', description: 'Phone number', example: '255712345678' },
    { variable: '{greeting}', description: 'Time-based greeting', example: 'Good morning' },
    { variable: '{date}', description: 'Current date', example: '12/5/2025' },
    { variable: '{time}', description: 'Current time', example: '02:30 PM' },
    { variable: '{day}', description: 'Day of week', example: 'Friday' },
    { variable: '{month}', description: 'Current month', example: 'December' },
    { variable: '{unique}', description: 'Random unique content (emoji/invisible text) - different for each message', example: '✨' },
    { variable: '{totalSpent}', description: 'Total amount spent', example: 'TZS 150,000' },
    { variable: '{lastPurchase}', description: 'Last purchase date', example: 'November 15, 2025' },
    { variable: '{lastPurchaseAmount}', description: 'Last purchase amount', example: 'TZS 25,000' },
    { variable: '{favoriteCategory}', description: 'Most purchased category', example: 'Electronics' },
    { variable: '{totalOrders}', description: 'Total number of orders', example: '5' },
    { variable: '{daysSinceLastOrder}', description: 'Days since last order', example: '30' }
  ];
}
