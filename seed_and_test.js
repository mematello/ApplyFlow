const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf8');
envStr.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k] = v.trim();
});
const { createClient } = require('@supabase/supabase-js');
const http = require('http');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedAndTest() {
  console.log('Fetching a user...');
  const { data: users, error: userError } = await supabase.from('profiles').select('id').limit(1);
  if (userError || !users.length) {
    console.error('No user found', userError);
    return;
  }
  const userId = users[0].id;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const parts = formatter.formatToParts(new Date());
  const p = Object.fromEntries(parts.map(pt => [pt.type, pt.value]));
  const today = `${p.year}-${p.month}-${p.day}`;

  console.log(`Setting profile timezone to UTC and send_time to 00:00:00...`);
  await supabase.from('profiles').update({
    reminder_timezone: 'UTC',
    reminder_send_time: '00:00:00'
  }).eq('id', userId);

  console.log('Inserting test application...');
  const { data: app, error: appError } = await supabase.from('applications').insert({
    user_id: userId,
    company_name: 'Test Corp Concurrency',
    role: 'Tester',
    status: 'applied',
    reminder_enabled: true,
    next_action_reminder_sent: false,
    next_action: 'Test follow-up',
    next_action_date: today
  }).select('id').single();

  if (appError) {
    console.error('Insert error', appError);
    return;
  }
  
  console.log('Inserted app:', app.id);

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/cron/reminders',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer 30631e618b206b340b8125ed2d3408f429bb3d65fd1ba9b6a2cdd1ca5d62886f'
    }
  };

  const makeRequest = (id) => {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ id, status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.end();
    });
  };

  console.log('Sending 3 concurrent requests to /api/cron/reminders...');
  const results = await Promise.all([
    makeRequest(1),
    makeRequest(2),
    makeRequest(3)
  ]);
  
  results.forEach(res => {
    console.log(`Request ${res.id} returned status ${res.status}: ${res.data}`);
  });

  console.log('Cleaning up...');
  await supabase.from('applications').delete().eq('id', app.id);
  console.log('Done');
}

seedAndTest();
