'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
 
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});
 
const CreateInvoice = FormSchema.omit({ id: true, date: true });

// This is temporary until @types/react-dom is updated
export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
 
export async function createInvoice(prevState: State, formData: FormData) {
  const { customerId: customerIdOrigin, amount: amountOrigin, status: statusOrigin } = Object.fromEntries<any>(formData);
  const validatedFields = CreateInvoice.safeParse({ customerId: customerIdOrigin, amount: amountOrigin, status: statusOrigin });
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
  const  { customerId, amount, status } = validatedFields.data;
  try {
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
   
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch(error) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
    // console.log('error: ', error);
    // throw new Error('Failed to create invoice.');
  }
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });
 
export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = Object.fromEntries<any>(formData);
  UpdateInvoice.parse({ customerId, amount, status });
  try {
    const amountInCents = amount * 100;
    console.log('amount: ', amount);
 
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
   
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  } catch {
  }
}


export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
  } catch(error) {
    console.log('error: ', error);
  }
}