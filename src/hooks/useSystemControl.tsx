
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SystemState = 'stopped' | 'running' | 'paused';

export const useSystemControl = () => {
  const [systemState, setSystemState] = useState<SystemState>('stopped');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const packageIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const simulateSystemUpdates = async () => {
    try {
      console.log('Running system simulation update...');
      
      // Update robot positions and battery levels
      const { data: robots } = await supabase.from('robots').select('*');
      
      if (robots) {
        for (const robot of robots) {
          let newBatteryLevel = robot.battery_level;
          let newStatus = robot.status;
          let newRow = robot.current_row;

          if (robot.status === 'active') {
            // Drain battery for active robots
            newBatteryLevel = Math.max(0, robot.battery_level - (Math.random() * 3 + 2));
            // Move robots around randomly
            newRow = Math.floor(Math.random() * 5);
            
            // If battery is low, send to charging
            if (newBatteryLevel <= 15) {
              newStatus = 'charging';
              newRow = 4; // charging station
              
              // Unassign any packages if robot goes to charging
              await supabase
                .from('packages')
                .update({ 
                  bot_assigned: null,
                  status: 'pending'
                })
                .eq('bot_assigned', robot.name)
                .eq('status', 'processing');
            }
          } else if (robot.status === 'charging') {
            // Charge the battery
            newBatteryLevel = Math.min(100, robot.battery_level + (Math.random() * 5 + 3));
            newRow = 4; // keep at charging station
            
            // If battery is full, make active again
            if (newBatteryLevel >= 95) {
              newStatus = 'active';
            }
          }

          await supabase
            .from('robots')
            .update({
              battery_level: Math.round(newBatteryLevel),
              status: newStatus,
              current_row: newRow
            })
            .eq('id', robot.id);
        }
      }

      // Assign pending packages to available robots
      if (Math.random() > 0.3) { // Increased chance of assignment
        const { data: pendingPackages } = await supabase
          .from('packages')
          .select('*')
          .eq('status', 'pending')
          .is('bot_assigned', null)
          .limit(1);

        const { data: availableRobots } = await supabase
          .from('robots')
          .select('*')
          .eq('status', 'active')
          .gt('battery_level', 20);

        if (pendingPackages && pendingPackages.length > 0 && availableRobots && availableRobots.length > 0) {
          const randomBot = availableRobots[Math.floor(Math.random() * availableRobots.length)];
          console.log(`Assigning package ${pendingPackages[0].uid} to robot ${randomBot.name}`);
          
          await supabase
            .from('packages')
            .update({
              bot_assigned: randomBot.name,
              status: 'processing'
            })
            .eq('id', pendingPackages[0].id);
        }
      }

      // Complete packages randomly
      if (Math.random() > 0.5) { // Increased completion rate
        const { data: processingPackages } = await supabase
          .from('packages')
          .select('*')
          .eq('status', 'processing')
          .limit(1);

        if (processingPackages && processingPackages.length > 0) {
          console.log(`Completing package ${processingPackages[0].uid}`);
          
          await supabase
            .from('packages')
            .update({ 
              status: 'completed',
              bot_assigned: null
            })
            .eq('id', processingPackages[0].id);
        }
      }

      // Update bin counts occasionally
      if (Math.random() > 0.8) {
        const { data: bins } = await supabase.from('bins').select('*');
        if (bins) {
          const randomBin = bins[Math.floor(Math.random() * bins.length)];
          const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
          const newCount = Math.max(0, Math.min(randomBin.capacity, randomBin.current_count + change));
          
          // Only update status if bin is not in maintenance
          let newStatus = randomBin.status;
          if (randomBin.status !== 'maintenance') {
            newStatus = newCount >= randomBin.capacity ? 'full' : 'available';
          }
          
          await supabase
            .from('bins')
            .update({ 
              current_count: newCount,
              status: newStatus
            })
            .eq('id', randomBin.id);
        }
      }

    } catch (error) {
      console.error('Error updating system:', error);
    }
  };

  const generateNewPackage = async () => {
    try {
      console.log('Generating new package...');
      const { error } = await supabase.rpc('create_random_package');
      if (error) {
        console.error('Error creating package:', error);
      } else {
        console.log('New package created successfully');
      }
    } catch (error) {
      console.error('Error generating package:', error);
    }
  };

  const startSystem = async () => {
    console.log('System started - beginning real-time simulation');
    setSystemState('running');
    
    // Clear existing intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (packageIntervalRef.current) {
      clearInterval(packageIntervalRef.current);
    }
    
    try {
      // Reactivate all idle robots (those that were stopped by emergency stop)
      await supabase
        .from('robots')
        .update({ status: 'active' })
        .eq('status', 'idle');
      
      console.log('Reactivated idle robots');
    } catch (error) {
      console.error('Error reactivating robots:', error);
    }
    
    // Run simulation every 5 seconds
    intervalRef.current = setInterval(simulateSystemUpdates, 5000);
    
    // Generate new packages every 8 seconds
    packageIntervalRef.current = setInterval(generateNewPackage, 8000);
    
    // Run one update immediately
    simulateSystemUpdates();
  };

  const pauseSystem = () => {
    console.log('System paused - stopping simulation');
    setSystemState('paused');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (packageIntervalRef.current) {
      clearInterval(packageIntervalRef.current);
      packageIntervalRef.current = null;
    }
  };

  const emergencyStop = async () => {
    console.log('Emergency stop activated - stopping all operations');
    setSystemState('stopped');
    
    // Clear intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (packageIntervalRef.current) {
      clearInterval(packageIntervalRef.current);
      packageIntervalRef.current = null;
    }

    try {
      // Stop all robots (except those charging)
      await supabase
        .from('robots')
        .update({ status: 'idle' })
        .neq('status', 'charging');

      // Unassign all processing packages
      await supabase
        .from('packages')
        .update({ 
          bot_assigned: null,
          status: 'pending'
        })
        .eq('status', 'processing');

      console.log('Emergency stop completed - all operations halted');
    } catch (error) {
      console.error('Error during emergency stop:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (packageIntervalRef.current) {
        clearInterval(packageIntervalRef.current);
      }
    };
  }, []);

  return {
    systemState,
    startSystem,
    pauseSystem,
    emergencyStop
  };
};
