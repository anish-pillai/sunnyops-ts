import { useState, useCallback } from 'react';
import { db } from '@/config/supabase';
import type { SiteDetail } from '@/config/constants';
import type { AllRolePermissions, UserProfile } from '@/types/user.types';
import { createClient } from '@supabase/supabase-js';

export const useSettings = () => {
  const [loading, setLoading] = useState(false);
  const [siteDetails, setSiteDetails] = useState<SiteDetail[]>([]);
  const [rolePerms, setRolePerms] = useState<AllRolePermissions>({});
  const [users, setUsers] = useState<UserProfile[]>([]);

  const fetchSiteDetails = useCallback(async () => {
    try {
      const { data, error } = await db.from('app_settings').select('value').eq('key', 'site_details').single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data?.value) setSiteDetails(data.value as SiteDetail[]);
    } catch (err) {
      console.error('Error fetching site details:', err);
    }
  }, []);

  const fetchRolePermissions = useCallback(async () => {
    try {
      const { data, error } = await db.from('app_settings').select('value').eq('key', 'role_permissions').single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data?.value) setRolePerms(data.value as AllRolePermissions);
    } catch (err) {
      console.error('Error fetching role permissions:', err);
    }
  }, []);

  const fetchUsers = useCallback(async (svcKey?: string) => {
    setLoading(true);
    try {
      let client = db;
      if (svcKey) {
        client = createClient(import.meta.env.VITE_SUPABASE_URL, svcKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });
      }

      // If we have an admin client, we might want to list auth users, 
      // but for now let's focus on profiles which is what the app uses.
      const { data, error } = await client.from('profiles').select('*').order('full_name');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSiteDetails = async (sites: SiteDetail[]) => {
    setLoading(true);
    try {
      const { error } = await db.from('app_settings').upsert({ key: 'site_details', value: sites }, { onConflict: 'key' });
      if (error) throw error;
      setSiteDetails(sites);
    } catch (err) {
      console.error('Error saving site details:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const saveRolePermissions = async (perms: AllRolePermissions) => {
    setLoading(true);
    try {
      const { error } = await db.from('app_settings').upsert({ key: 'role_permissions', value: perms }, { onConflict: 'key' });
      if (error) throw error;
      setRolePerms(perms);
    } catch (err) {
      console.error('Error saving role permissions:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (profile: Partial<UserProfile>, svcKey?: string) => {
    setLoading(true);
    try {
      let client = db;
      if (svcKey) {
        client = createClient(import.meta.env.VITE_SUPABASE_URL, svcKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });
      }
      const { error } = await client.from('profiles').update(profile).eq('id', profile.id);
      if (error) throw error;
      await fetchUsers(svcKey);
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    siteDetails,
    rolePerms,
    users,
    fetchSiteDetails,
    fetchRolePermissions,
    fetchUsers,
    saveSiteDetails,
    saveRolePermissions,
    updateUserProfile
  };
};
