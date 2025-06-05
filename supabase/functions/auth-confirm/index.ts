
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailConfirmationRequest {
  user: {
    email: string;
    user_metadata: {
      name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: EmailConfirmationRequest = await req.json();
    const { user, email_data } = body;

    console.log("Sending confirmation email to:", user.email);

    const confirmationUrl = `${email_data.site_url}/auth/confirm?token_hash=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;

    const emailResponse = await resend.emails.send({
      from: `${Deno.env.get('SENDER_NAME')} <${Deno.env.get('SENDER_EMAIL')}>`,
      to: [user.email],
      subject: "Konfirmasi Email - Tugasku",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4f46e5; margin: 0;">Tugasku</h1>
            <p style="color: #6b7280; margin: 5px 0;">Kelola Deadline Anda dengan Mudah</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Selamat datang, ${user.user_metadata?.name || 'Pengguna'}!</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Terima kasih telah mendaftar di Tugasku. Untuk mengaktifkan akun Anda, silakan klik tombol di bawah ini:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" 
                 style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Konfirmasi Email
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              Jika tombol di atas tidak berfungsi, salin dan tempel URL berikut ke browser Anda:
            </p>
            <p style="color: #4f46e5; font-size: 12px; word-break: break-all; margin: 10px 0;">
              ${confirmationUrl}
            </p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 12px;">
            <p>Email ini dikirim secara otomatis. Jika Anda tidak mendaftar di Tugasku, abaikan email ini.</p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in auth-confirm function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
