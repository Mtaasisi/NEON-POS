// Email Receipt Template with Business Logo
import React from 'react';
import { useBusinessInfo } from '../../hooks/useBusinessInfo';

interface EmailReceiptTemplateProps {
  receiptNumber: string;
  date: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
  paymentMethod: string;
  cashier: string;
}

const EmailReceiptTemplate: React.FC<EmailReceiptTemplateProps> = ({
  receiptNumber,
  date,
  items,
  subtotal,
  tax = 0,
  discount = 0,
  total,
  customer,
  paymentMethod,
  cashier
}) => {
  const { businessInfo } = useBusinessInfo();

  const generateEmailHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${receiptNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
              ${businessInfo.logo ? `
              <img src="${businessInfo.logo}" alt="${businessInfo.name}" style="height: 60px; width: auto; margin-bottom: 15px;">
              ` : ''}
              <h1 style="color: white; margin: 0; font-size: 24px;">${businessInfo.name}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">
                ${businessInfo.address || ''}<br>
                ${businessInfo.phone ? businessInfo.phone.split(',').map((p: string) => `Tel: ${p.trim()}`).join(' | ') : ''} ${businessInfo.email ? `| ${businessInfo.email}` : ''}
              </p>
            </td>
          </tr>

          <!-- Receipt Info -->
          <tr>
            <td style="padding: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 2px solid #667eea;">
                    <h2 style="margin: 0; color: #333; font-size: 20px;">Receipt #${receiptNumber}</h2>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${date}</p>
                  </td>
                </tr>
              </table>

              ${customer ? `
              <!-- Customer Info -->
              <table style="width: 100%; margin-top: 20px;">
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
                    <p style="margin: 0 0 5px 0; color: #333; font-weight: bold;">Customer:</p>
                    <p style="margin: 0; color: #666;">${customer.name}</p>
                    ${customer.email ? `<p style="margin: 5px 0 0 0; color: #666;">${customer.email}</p>` : ''}
                    ${customer.phone ? `<p style="margin: 5px 0 0 0; color: #666;">${customer.phone}</p>` : ''}
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Items -->
              <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="padding: 12px; text-align: left; color: #333; font-size: 14px; border-bottom: 2px solid #dee2e6;">Item</th>
                    <th style="padding: 12px; text-align: center; color: #333; font-size: 14px; border-bottom: 2px solid #dee2e6;">Qty</th>
                    <th style="padding: 12px; text-align: right; color: #333; font-size: 14px; border-bottom: 2px solid #dee2e6;">Price</th>
                    <th style="padding: 12px; text-align: right; color: #333; font-size: 14px; border-bottom: 2px solid #dee2e6;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => `
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #333;">${item.name}</td>
                    <td style="padding: 12px; text-align: center; border-bottom: 1px solid #dee2e6; color: #666;">${item.quantity}</td>
                    <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6; color: #666;">${item.price.toLocaleString()}</td>
                    <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6; color: #333; font-weight: bold;">${item.total.toLocaleString()}</td>
                  </tr>
                  `).join('')}
                </tbody>
              </table>

              <!-- Totals -->
              <table style="width: 100%; margin-top: 20px;">
                <tr>
                  <td style="padding: 8px 12px; text-align: right; color: #666;">Subtotal:</td>
                  <td style="padding: 8px 12px; text-align: right; color: #333; font-weight: bold; width: 120px;">${subtotal.toLocaleString()}</td>
                </tr>
                ${tax > 0 ? `
                <tr>
                  <td style="padding: 8px 12px; text-align: right; color: #666;">Tax:</td>
                  <td style="padding: 8px 12px; text-align: right; color: #333; font-weight: bold;">${tax.toLocaleString()}</td>
                </tr>
                ` : ''}
                ${discount > 0 ? `
                <tr>
                  <td style="padding: 8px 12px; text-align: right; color: #666;">Discount:</td>
                  <td style="padding: 8px 12px; text-align: right; color: #dc3545; font-weight: bold;">-${discount.toLocaleString()}</td>
                </tr>
                ` : ''}
                <tr style="border-top: 2px solid #667eea;">
                  <td style="padding: 12px; text-align: right; color: #333; font-size: 18px; font-weight: bold;">Total:</td>
                  <td style="padding: 12px; text-align: right; color: #667eea; font-size: 20px; font-weight: bold;">${total.toLocaleString()}</td>
                </tr>
              </table>

              <!-- Payment Info -->
              <table style="width: 100%; margin-top: 20px;">
                <tr>
                  <td style="padding: 15px; background-color: #e7f3ff; border-radius: 4px; border-left: 4px solid #667eea;">
                    <p style="margin: 0; color: #333;"><strong>Payment Method:</strong> ${paymentMethod}</p>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Served by: ${cashier}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
              <p style="margin: 0 0 10px 0; color: #667eea; font-weight: bold; font-size: 16px;">Thank you for your purchase!</p>
              <p style="margin: 0; color: #666; font-size: 14px;">
                ${businessInfo.website ? `Visit us at: <a href="${businessInfo.website}" style="color: #667eea; text-decoration: none;">${businessInfo.website}</a><br>` : ''}
                For any questions, contact us at ${businessInfo.email || businessInfo.phone || ''}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  };

  // For preview/display
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div 
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: generateEmailHTML() }}
      />
    </div>
  );
};

export default EmailReceiptTemplate;

// Export function to get HTML string for email sending
export const generateEmailReceiptHTML = (props: EmailReceiptTemplateProps, businessInfo: any) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${props.receiptNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
              ${businessInfo.logo ? `<img src="${businessInfo.logo}" alt="${businessInfo.name}" style="height: 60px; width: auto; margin-bottom: 15px;">` : ''}
              <h1 style="color: white; margin: 0; font-size: 24px;">${businessInfo.name}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center;">
              <h2>Receipt #${props.receiptNumber}</h2>
              <p>${props.date}</p>
              <p>Thank you for your purchase!</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

