
import React, { useState, useEffect } from 'react';
import { Switch } from '../ui/switch';
import { useAuth } from '../../context/auth-context';

const ConsentSettings = () => {
  const { user } = useAuth();
  const [isMonitoringPaused, setIsMonitoringPaused] = useState(true);

  useEffect(() => {
    // Fetch the user's current consent status
    const fetchConsentStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/users/` + user._id); // Assuming you have an endpoint to get user details
        const data = await response.json();
        setIsMonitoringPaused(data.monitoringPaused);
      } catch (error) {
        console.error('Error fetching consent status:', error);
      }
    };

    if (user) {
      fetchConsentStatus();
    }
  }, [user]);

  const handleConsentChange = async (paused) => {
    setIsMonitoringPaused(paused);
    try {
      const response = await fetch(`${API_URL}/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('WorkflowToken')}`,
        },
        body: JSON.stringify({ consent: !paused }),
      });

      if (!response.ok) {
        throw new Error('Failed to update consent');
      }

      const data = await response.json();
      console.log(data.msg);
    } catch (error) {
      console.error('Error updating consent:', error);
      // Revert the switch state if the API call fails
      setIsMonitoringPaused(!paused);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div>
        <h3 className="text-lg font-medium">Pause Monitoring</h3>
        <p className="text-sm text-muted-foreground">
          Temporarily pause employee monitoring. This will stop all tracking and screen capture.
        </p>
      </div>
      <Switch checked={isMonitoringPaused} onCheckedChange={handleConsentChange} />
    </div>
  );
};

export default ConsentSettings;
