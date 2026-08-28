import type { APIRoute } from 'astro';
import sql from '../../utils/db';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { requireSameOrigin } from '../../utils/csrf';
import { getActiveMode } from '../../utils/dataSource'; // OFFLINE-MODE FEATURE
import { mysqlExec } from '../../utils/mysqlDb'; // OFFLINE-MODE FEATURE
import fs from 'fs'; // OFFLINE-MODE FEATURE
import path from 'path'; // OFFLINE-MODE FEATURE

// This endpoint previously accepted any file of any size with zero checks —
// an attacker could upload arbitrarily large files (storage/cost abuse) or
// files of a type never meant to be there (e.g. an .exe or .html file that
// later gets served back with an inferred content-type). No auth is
// required here since anonymous submission is intentional (user_id is
// optional), so these limits are the only real backstop.
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = new Set(['.docx', '.pdf']);
function isAllowedFile(file: File): boolean {
  if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')) {
    return true;
  }
  const name = file.name.toLowerCase();
  return Array.from(ALLOWED_EXTENSIONS).some((ext) => name.endsWith(ext));
}

// Initialize Supabase client. Use Service Role key to bypass RLS.
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// Helper to upload a file to Supabase Storage and return its public URL
const saveFile = async (file: File, folderName: string) => {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const filePath = `${folderName}/${sanitizedFileName}`;

  const { error } = await supabase.storage
    .from('uploads')
    .upload(filePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true
    });

  if (error) throw new Error(`Supabase upload error: ${error.message}`);

  const { data: publicUrlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
};

// OFFLINE-MODE FEATURE START - delete this function to remove the MySQL fallback
// Supabase Storage needs internet just as much as Supabase Postgres does, so
// when running on the MySQL fallback, files are saved to this project's own
// uploads/ folder instead and served back through /api/files/ — same
// folder/filename convention as saveFile() above, so paths line up with
// what scripts/sync-files.mjs and scripts/sync-to-mysql.mjs's URL rewriter
// already expect.
const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');
const saveFileLocally = async (file: File, folderName: string) => {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const destDir = path.join(UPLOADS_ROOT, folderName);
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(destDir, sanitizedFileName), buffer);
  return `/api/files/${folderName}/${sanitizedFileName}`;
};
// OFFLINE-MODE FEATURE END

// Helper: parse a nullable string from FormData
const str = (v: FormDataEntryValue | null): string | null =>
  v && typeof v === 'string' && v.trim() !== '' ? v.trim() : null;

// Helper: parse a nullable date from FormData
const dateVal = (v: FormDataEntryValue | null): string | null => {
  const s = str(v);
  return s && s !== 'undefined' ? s : null;
};

// Helper: parse a nullable integer from FormData
const intVal = (v: FormDataEntryValue | null): number | null => {
  const s = str(v);
  if (!s) return null;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const csrfResponse = requireSameOrigin(request);
  if (csrfResponse) return csrfResponse;

  try {
    const mode = await getActiveMode(cookies); // OFFLINE-MODE FEATURE
    const formData = await request.formData();

    // ----------------------------------------------------------------
    // STEP 2 — Request Classification
    // ----------------------------------------------------------------
    const requestType   = str(formData.get('requestType'));

    // ----------------------------------------------------------------
    // STEP 3 — Common Fields
    // ----------------------------------------------------------------
    const userId        = str(formData.get('user_id'));
    const email         = str(formData.get('email')) || '';
    const officeName    = str(formData.get('office_name')) || 'UnknownOffice';
    const mName         = str(formData.get('requestedByName')) || '';
    const nNo           = str(formData.get('requestedByMobile')) || '';
    const aName         = str(formData.get('alternateContactName'));
    const aNo           = str(formData.get('alternateContactMobile'));

    // ----------------------------------------------------------------
    // STEP 3 — Official AdZU Website
    // ----------------------------------------------------------------
    const webDateSubmitted      = dateVal(formData.get('webDateSubmitted'));
    const webDateRequired       = dateVal(formData.get('webDateRequired'));
    const webEventName          = str(formData.get('webEventName'));
    const webWhereToPost        = str(formData.get('webWhereToPost'));
    const webWhereToPostOther   = str(formData.get('webWhereToPostOther'));
    const webFormOfPost         = str(formData.get('webFormOfPost'));

    // ----------------------------------------------------------------
    // STEP 3 — Official AdZU Social Media Accounts
    // ----------------------------------------------------------------
    const socMed                = str(formData.get('socialAccount'));       // comma-sep platforms
    const socialService         = str(formData.get('socialService'));       // comma-sep services
    const socialServiceOther    = str(formData.get('socialServiceOther'));

    // ----------------------------------------------------------------
    // STEP 3 — Print Media
    // ----------------------------------------------------------------
    const printDateRequested    = dateVal(formData.get('printDateRequested'));
    const printDateNeeded       = dateVal(formData.get('printDateNeeded'));
    const printEventInfo        = str(formData.get('printEventInfo'));
    const printSizes            = str(formData.get('printSizes'));          // comma-sep
    const printSizesOther       = str(formData.get('printSizesOther'));
    const printNumSheets        = intVal(formData.get('printNumSheets'));

    // ----------------------------------------------------------------
    // STEP 3 — Photo / Video Documentation
    // ----------------------------------------------------------------
    const pvPointPerson         = str(formData.get('photoVideoPointPerson'));
    const pvEventDate           = dateVal(formData.get('photoVideoDate'));
    const pvEventTime           = str(formData.get('photoVideoTime'));
    const pvEventLocation       = str(formData.get('photoVideoLocation'));
    const pvEventName           = str(formData.get('photoVideoEventName'));
    const pvEventInfo           = str(formData.get('photoVideoEventInfo'));

    // ----------------------------------------------------------------
    // STEP 3 — Facebook Live
    // ----------------------------------------------------------------
    const fbPointPerson         = str(formData.get('fbLivePointPerson'));
    const fbEventTitle          = str(formData.get('fbLiveEventTitle'));
    const fbEventDate           = dateVal(formData.get('fbLiveEventDate'));
    const fbEventTime           = str(formData.get('fbLiveEventTime'));
    const fbDuration            = str(formData.get('fbLiveDuration'));
    const fbCoordinator         = str(formData.get('fbLiveCoordinator'));

    // ----------------------------------------------------------------
    // STEP 3 — Fallback (Local Media, Other Services, File Photos, Mascot)
    // ----------------------------------------------------------------
    const service               = str(formData.get('serviceType'));         // pipe-sep summary label
    const otherServiceDetail    = str(formData.get('otherServiceDetail'));  // free-text "Other"

    // ----------------------------------------------------------------
    // STEP 4 — Additional Context
    // ----------------------------------------------------------------
    const eventDetails          = str(formData.get('eventDetails'));

    // ----------------------------------------------------------------
    // File Uploads — Supabase Storage when online, local uploads/ folder
    // when running on the MySQL fallback (Supabase Storage needs internet
    // too).
    // ----------------------------------------------------------------
    const safeOfficeName = officeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderName = `${safeOfficeName}_${timestamp}`;

    const ppTemplateUrls: string[] = [];
    const imageUrls: string[]      = [];
    const videoUrls: string[]      = [];
    const audioUrls: string[]      = [];

    const files = formData.getAll('files') as File[];
    for (const file of files) {
      if (file.size === 0) continue;
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return new Response(
          JSON.stringify({ message: `File "${file.name}" exceeds the 50MB size limit.` }),
          { status: 400 },
        );
      }
      if (!isAllowedFile(file)) {
        return new Response(
          JSON.stringify({ message: `File "${file.name}" is not an accepted file type.` }),
          { status: 400 },
        );
      }
      const savedPath = mode === 'mysql'
        // OFFLINE-MODE FEATURE START - delete this ternary branch to remove the MySQL fallback
        ? await saveFileLocally(file, folderName)
        // OFFLINE-MODE FEATURE END
        : await saveFile(file, folderName);
      if (file.name.endsWith('.docx') || file.name.endsWith('.pdf')) ppTemplateUrls.push(savedPath);
      else if (file.type.startsWith('image/'))  imageUrls.push(savedPath);
      else if (file.type.startsWith('video/'))  videoUrls.push(savedPath);
      else if (file.type.startsWith('audio/'))  audioUrls.push(savedPath);
    }

    const ppTemplate = ppTemplateUrls.length > 0 ? ppTemplateUrls.join(',') : null;
    const image      = imageUrls.length > 0      ? imageUrls.join(',')      : null;
    const video      = videoUrls.length > 0      ? videoUrls.join(',')      : null;
    const audio      = audioUrls.length > 0      ? audioUrls.join(',')      : null;

    // ----------------------------------------------------------------
    // INSERT — All columns including new per-service fields
    // ----------------------------------------------------------------
    if (mode === 'mysql') {
      // OFFLINE-MODE FEATURE START - delete this block to remove the MySQL fallback
      await mysqlExec(
        `INSERT INTO submissions (
          email, request_type, \`mName\`, \`nNo\`, \`aName\`, \`aNo\`, office_name, user_id,
          web_date_submitted, web_date_required, web_event_name, web_where_to_post, web_where_to_post_other, web_form_of_post,
          \`socMed\`, social_service, social_service_other,
          print_date_requested, print_date_needed, print_event_info, print_sizes, print_sizes_other, print_num_sheets,
          pv_point_person, pv_event_date, pv_event_time, pv_event_location, pv_event_name, pv_event_info,
          fb_point_person, fb_event_title, fb_event_date, fb_event_time, fb_duration, fb_coordinator,
          service, other_service_detail,
          \`ppTemplate\`, image, video, audio,
          \`eventDetails\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          email, requestType, mName, nNo, aName, aNo, officeName, userId ? parseInt(userId) : null,
          webDateSubmitted, webDateRequired, webEventName, webWhereToPost, webWhereToPostOther, webFormOfPost,
          socMed, socialService, socialServiceOther,
          printDateRequested, printDateNeeded, printEventInfo, printSizes, printSizesOther, printNumSheets,
          pvPointPerson, pvEventDate, pvEventTime, pvEventLocation, pvEventName, pvEventInfo,
          fbPointPerson, fbEventTitle, fbEventDate, fbEventTime, fbDuration, fbCoordinator,
          service, otherServiceDetail,
          ppTemplate, image, video, audio,
          eventDetails,
        ],
      );
      // OFFLINE-MODE FEATURE END
    } else {
      await sql`
        INSERT INTO submissions (
          email,
          request_type,
          "mName",
          "nNo",
          "aName",
          "aNo",
          office_name,
          user_id,

          -- Website
          web_date_submitted,
          web_date_required,
          web_event_name,
          web_where_to_post,
          web_where_to_post_other,
          web_form_of_post,

          -- Social Media
          "socMed",
          social_service,
          social_service_other,

          -- Print Media
          print_date_requested,
          print_date_needed,
          print_event_info,
          print_sizes,
          print_sizes_other,
          print_num_sheets,

          -- Photo / Video Documentation
          pv_point_person,
          pv_event_date,
          pv_event_time,
          pv_event_location,
          pv_event_name,
          pv_event_info,

          -- Facebook Live
          fb_point_person,
          fb_event_title,
          fb_event_date,
          fb_event_time,
          fb_duration,
          fb_coordinator,

          -- Fallback / Other
          service,
          other_service_detail,

          -- Files
          "ppTemplate",
          image,
          video,
          audio,

          -- Final Step
          "eventDetails"
        )
        VALUES (
          ${email},
          ${requestType},
          ${mName},
          ${nNo},
          ${aName},
          ${aNo},
          ${officeName},
          ${userId ? parseInt(userId) : null},

          ${webDateSubmitted},
          ${webDateRequired},
          ${webEventName},
          ${webWhereToPost},
          ${webWhereToPostOther},
          ${webFormOfPost},

          ${socMed},
          ${socialService},
          ${socialServiceOther},

          ${printDateRequested},
          ${printDateNeeded},
          ${printEventInfo},
          ${printSizes},
          ${printSizesOther},
          ${printNumSheets},

          ${pvPointPerson},
          ${pvEventDate},
          ${pvEventTime},
          ${pvEventLocation},
          ${pvEventName},
          ${pvEventInfo},

          ${fbPointPerson},
          ${fbEventTitle},
          ${fbEventDate},
          ${fbEventTime},
          ${fbDuration},
          ${fbCoordinator},

          ${service},
          ${otherServiceDetail},

          ${ppTemplate},
          ${image},
          ${video},
          ${audio},

          ${eventDetails}
        )
      `;
    }

    return new Response(JSON.stringify({ message: 'Success' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Submission error:', error);
    return new Response(
      JSON.stringify({ message: 'Error processing submission', error: error.message }),
      { status: 500 }
    );
  }
};
