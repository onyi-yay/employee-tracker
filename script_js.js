const N8N_FORM_URL = 'YOUR_N8N_FORM_URL_HERE'; // Replace with your n8n form URL
        
        // Check if user is already clocked in (stored in browser)
        window.addEventListener('load', () => {
            const clockedInData = localStorage.getItem('clockedInData');
            if (clockedInData) {
                const data = JSON.parse(clockedInData);
                showClockedInView(data);
            }
        });
        
        // Handle Clock In
        document.getElementById('clockInForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const clockInBtn = document.getElementById('clockInBtn');
            const resultDiv = document.getElementById('result');
            
            clockInBtn.disabled = true;
            clockInBtn.textContent = '⏳ Clocking In...';
            
            try {
                const fullName = document.getElementById('fullName').value;
                const email = document.getElementById('email').value;
                const position = document.getElementById('position').value;
                const clockInTime = new Date().toISOString();
                
                // Submit Clock In to n8n
                const formData = new FormData();
                formData.append('Full Name', fullName);
                formData.append('Email', email);
                formData.append('Position', position);
                formData.append('Action', 'Clock In');
                
                const response = await fetch(N8N_FORM_URL, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    // Store user data in browser
                    const userData = {
                        fullName,
                        email,
                        position,
                        clockInTime
                    };
                    localStorage.setItem('clockedInData', JSON.stringify(userData));
                    
                    // Show clocked in view
                    showClockedInView(userData);
                } else {
                    throw new Error('Clock in failed');
                }
            } catch (error) {
                resultDiv.innerHTML = `
                    <div class="result error">
                        <h3>❌ Error</h3>
                        <p>Failed to clock in. Please try again.</p>
                    </div>
                `;
                clockInBtn.disabled = false;
                clockInBtn.textContent = '🟢 Clock In';
            }
        });
        
        // Show Clocked In View
        function showClockedInView(data) {
            document.getElementById('clockInView').classList.add('hidden');
            document.getElementById('clockedInView').classList.add('active');
            
            document.getElementById('displayName').textContent = data.fullName;
            document.getElementById('displayPosition').textContent = data.position;
            document.getElementById('displayClockIn').textContent = new Date(data.clockInTime).toLocaleTimeString();
            
            // Start timer
            startTimer(data.clockInTime);
        }
        
        // Timer Function
        let timerInterval;
        let reminderShown = false;
        
        function startTimer(startTime) {
            const start = new Date(startTime).getTime();
            
            // Request notification permission
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
            
            timerInterval = setInterval(() => {
                const now = new Date().getTime();
                const elapsed = now - start;
                
                const hours = Math.floor(elapsed / (1000 * 60 * 60));
                const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
                
                document.getElementById('timer').textContent = 
                    `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                
                // Check for 8-hour reminder
                if (hours >= 8 && !reminderShown) {
                    showClockOutReminder('8 hours');
                    reminderShown = true;
                }
            }, 1000);
            
            // Set end-of-day reminder (6 PM)
            scheduleEndOfDayReminder();
        }
        
        function scheduleEndOfDayReminder() {
            const now = new Date();
            const endOfDay = new Date();
            endOfDay.setHours(18, 0, 0, 0); // 6 PM
            
            // If it's already past 6 PM, skip
            if (now > endOfDay) return;
            
            const timeUntilReminder = endOfDay - now;
            
            setTimeout(() => {
                showClockOutReminder('end of day');
            }, timeUntilReminder);
        }
        
        function showClockOutReminder(reason) {
            // Browser notification
            if (Notification.permission === 'granted') {
                new Notification('⏰ Time to Clock Out!', {
                    body: `You've reached ${reason}. Don't forget to clock out!`,
                    icon: '⏰',
                    requireInteraction: true
                });
            }
            
            // Visual reminder on page
            const reminder = document.createElement('div');
            reminder.className = 'result';
            reminder.style.background = '#fff3cd';
            reminder.style.color = '#856404';
            reminder.style.border = '2px solid #ffc107';
            reminder.innerHTML = `
                <h3>⏰ Clock Out Reminder</h3>
                <p>You've been working for ${reason}!</p>
                <p>Remember to clock out when you're done.</p>
            `;
            
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '';
            resultDiv.appendChild(reminder);
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                reminder.style.display = 'none';
            }, 10000);
        }
        
        // Handle Clock Out
        document.getElementById('clockOutBtn').addEventListener('click', async () => {
            const clockOutBtn = document.getElementById('clockOutBtn');
            const resultDiv = document.getElementById('result');
            
            if (!confirm('Are you sure you want to clock out?')) {
                return;
            }
            
            clockOutBtn.disabled = true;
            clockOutBtn.textContent = '⏳ Clocking Out...';
            
            try {
                const data = JSON.parse(localStorage.getItem('clockedInData'));
                
                // Submit Clock Out to n8n
                const formData = new FormData();
                formData.append('Full Name', data.fullName);
                formData.append('Email', data.email);
                formData.append('Position', data.position);
                formData.append('Action', 'Clock Out');
                
                const response = await fetch(N8N_FORM_URL, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    // Stop timer
                    clearInterval(timerInterval);
                    
                    // Calculate total hours
                    const clockInTime = new Date(data.clockInTime);
                    const clockOutTime = new Date();
                    const hoursWorked = ((clockOutTime - clockInTime) / (1000 * 60 * 60)).toFixed(2);
                    
                    resultDiv.innerHTML = `
                        <div class="result success">
                            <h3>✅ Clocked Out Successfully!</h3>
                            <p><strong>${data.fullName}</strong></p>
                            <p>Total Hours: <strong>${hoursWorked} hours</strong></p>
                            <p>Have a great day!</p>
                        </div>
                    `;
                    
                    // Clear stored data
                    localStorage.removeItem('clockedInData');
                    
                    // Reset to clock in view after 5 seconds
                    setTimeout(() => {
                        document.getElementById('clockedInView').classList.remove('active');
                        document.getElementById('clockInView').classList.remove('hidden');
                        document.getElementById('clockInForm').reset();
                        resultDiv.innerHTML = '';
                    }, 5000);
                } else {
                    throw new Error('Clock out failed');
                }
