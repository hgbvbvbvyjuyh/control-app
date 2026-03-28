import http from 'http';

const BASE_URL = 'http://localhost:3001/api';

const request = (method: string, path: string, data?: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    
    const req = http.request(`${BASE_URL}${path}`, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
};

async function runTests() {
  console.log('--- STARTING API VERIFICATION ---\n');
  const report: string[] = [];
  const addReport = (msg: string) => { console.log(msg); report.push(msg); };

  try {
    // 1 & 4. Frameworks
    addReport('Testing Frameworks...');
    const fwRes = await request('GET', '/frameworks');
    const defaultFw = fwRes.data.find((f: any) => f.isDefault);
    if (defaultFw) {
      addReport('✅ Default framework exists.');
    } else {
      addReport('❌ Default framework missing.');
    }

    const newFw = await request('POST', '/frameworks', { name: 'Test FW', keys: [{ key: 'k1', label: 'L1' }] });
    if (newFw.status === 201) addReport('✅ Custom framework created.');
    else addReport('❌ Failed to create custom framework.');

    const delFw = await request('DELETE', `/frameworks/${newFw.data.id}`);
    if (delFw.status === 204) addReport('✅ Custom framework deleted.');
    else addReport('❌ Failed to delete custom framework.');

    // 1. Goal System (Hierarchy)
    addReport('\nTesting Goal System (Hierarchy)...');
    
    // Create Yearly
    const yearly = await request('POST', '/goals', { frameworkId: defaultFw.id, goalType: 'yearly', data: { k1: 'Year 2026' } });
    // Create Monthly (Child of Yearly)
    const monthly = await request('POST', '/goals', { frameworkId: defaultFw.id, goalType: 'monthly', parentId: yearly.data.id, data: { k1: 'March 2026' } });
    // Create Weekly (Child of Monthly)
    const weekly = await request('POST', '/goals', { frameworkId: defaultFw.id, goalType: 'weekly', parentId: monthly.data.id, data: { k1: 'Week 1' } });
    // Create Daily (Child of Weekly)
    const daily = await request('POST', '/goals', { frameworkId: defaultFw.id, goalType: 'daily', parentId: weekly.data.id, data: { k1: 'Day 1' } });
    
    // Create Independent Goal
    const independent = await request('POST', '/goals', { frameworkId: defaultFw.id, goalType: 'daily', isIndependent: true, data: { k1: 'Lone Task' } });

    if (yearly.status === 201 && daily.status === 201 && independent.status === 201) {
      addReport('✅ Nested and independent goals created.');
    } else {
      addReport('❌ Goal creation failed.');
    }

    // 2. Session System
    addReport('\nTesting Session System...');
    
    const s1 = await request('POST', '/sessions', { goalId: daily.data.id, workTime: 1500, restTime: 300 });
    if (s1.status === 201) addReport('✅ Session started successfully.');
    else addReport('❌ Failed to start session.');

    const s2 = await request('POST', '/sessions', { goalId: daily.data.id, workTime: 1500, restTime: 300 });
    if (s2.status === 409) addReport('✅ Correctly enforces single active session (409 Conflict).');
    else addReport(`❌ Allowed multiple active sessions (Status ${s2.status}).`);

    // End session
    const s1End = await request('POST', `/sessions/${s1.data.id}/end`, { result: 'Good focus' });
    if (s1End.status === 200 && s1End.data.status === 'completed') addReport('✅ Session ended correctly.');
    else addReport('❌ Failed to end session.');

    // Test Skip Session
    const s3 = await request('POST', '/sessions', { goalId: daily.data.id, workTime: 1500, restTime: 300 });
    const s3SkipFail = await request('POST', `/sessions/${s3.data.id}/skip`, {});
    if (s3SkipFail.status === 400) addReport('✅ Skip correctly requires skipReason.');
    else addReport('❌ Skip allowed without skipReason.');

    const s3SkipSuccess = await request('POST', `/sessions/${s3.data.id}/skip`, { skipReason: 'Interrupted' });
    if (s3SkipSuccess.status === 200 && s3SkipSuccess.data.status === 'skipped') addReport('✅ Session skipped with reason.');
    else addReport('❌ Failed to skip session properly.');


    // 3. Progress System
    addReport('\nTesting Progress System propagation...');
    const dCheck = await request('GET', `/goals/${daily.data.id}`);
    const wCheck = await request('GET', `/goals/${weekly.data.id}`);
    const mCheck = await request('GET', `/goals/${monthly.data.id}`);
    const yCheck = await request('GET', `/goals/${yearly.data.id}`);

    // Since we created 2 sessions for the daily goal (1 completed, 1 skipped), progress is based on completed / total.
    // Total sessions = 2, completed = 1 => 50%
    const expectedDailyProgress = 50; 
    if (dCheck.data.progress === expectedDailyProgress) addReport(`✅ Daily progress calculated correctly (${dCheck.data.progress}%).`);
    else addReport(`❌ Daily progress incorrect: expected 50, got ${dCheck.data.progress}.`);

    if (wCheck.data.progress === expectedDailyProgress) addReport(`✅ Weekly progress propagated correctly (${wCheck.data.progress}%).`);
    else addReport(`❌ Weekly progress incorrect: expected 50, got ${wCheck.data.progress}.`);

    if (mCheck.data.progress === expectedDailyProgress) addReport(`✅ Monthly progress propagated correctly (${mCheck.data.progress}%).`);
    else addReport(`❌ Monthly progress incorrect: expected 50, got ${mCheck.data.progress}.`);

    if (yCheck.data.progress === expectedDailyProgress) addReport(`✅ Yearly progress propagated correctly (${yCheck.data.progress}%).`);
    else addReport(`❌ Yearly progress incorrect: expected 50, got ${yCheck.data.progress}.`);


    // 5. Journaling
    addReport('\nTesting Journaling...');
    const qRes = await request('GET', '/questions');
    if (qRes.data.length > 0 && qRes.data.some((q: any) => q.isDefault)) {
      addReport('✅ Default questions exist.');
      addReport(`✅ Categories found: [...new Set(qRes.data.map(q => q.category))]`);
    } else {
      addReport('❌ Journal questions missing.');
    }

    const newQ = await request('POST', '/questions', { category: 'test', question: 'Test Q?' });
    if (newQ.status === 201) addReport('✅ Custom question added.');
    else addReport('❌ Failed to add custom question.');

    const delQ = await request('DELETE', `/questions/${newQ.data.id}`);
    if (delQ.status === 204) addReport('✅ Custom question deleted.');
    else addReport('❌ Failed to delete custom question.');

    const delDefaultQ = await request('DELETE', `/questions/${qRes.data.find((q: any) => q.isDefault).id}`);
    if (delDefaultQ.status === 403) addReport('✅ Correctly prevented deletion of default question.');
    else addReport('❌ Allowed deletion of default question.');


    // 6. Export
    addReport('\nTesting Export...');
    const exportRes = await request('GET', '/export');
    if (exportRes.status === 200 && exportRes.data.goals && exportRes.data.sessions && exportRes.data.frameworks) {
      addReport('✅ All data correctly exported as JSON.');
    } else {
      addReport('❌ Export failed or incomplete.');
    }
    
    console.log('\n--- VERIFICATION DONE ---');

  } catch (err) {
    console.error('Test script failed:', err);
  }
}

runTests();
