import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import { Button, Text, TextInput, Chip, IconButton, Card } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { useSession } from '../contexts/SessionContext';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary, ImageLibraryOptions } from 'react-native-image-picker';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'PlayerProfile'>;

const BAT_STYLES = ['RHB', 'LHB'];
const BOWL_STYLES = ['RAWS', 'RAOS', 'RAP', 'LAP', 'LAO', 'LAWS'];
const BAT_ROLES = ['Opener', 'Top Order', 'Middle Order', 'Finisher'];
const BOWL_ROLES = ['Opening Bowler', 'First Change', 'Middle Over Specialist', 'Death Specialist'];
const PLAY_ROLES = ['Batting All-rounder', 'Bowling All-rounder', 'Batter', 'WK-Batter', 'Bowler'];

export default function PlayerProfile() {
  const navigation = useNavigation<NavigationProp>();
  const { signOut } = useSession();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    dob: null as Date | null,
    batStyle: '',
    bowlStyle: '',
    batRoles: '',
    bowlRoles: '',
    playRole: '',
    favBatters: '',
    favBowlers: '',
    avatar_url: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigation.goBack();
        return;
      }

      const { data, error } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile({
          ...data,
          dob: data.dob ? new Date(data.dob) : null,
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    console.log('[CricketOS][PlayerProfile] handleLogout: opening confirm dialog');
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => console.log('[CricketOS][PlayerProfile] handleLogout: cancelled'),
      },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          console.log('[CricketOS][PlayerProfile] handleLogout: confirmed, calling signOut()');
          void (async () => {
            const { error } = await signOut();
            console.log('[CricketOS][PlayerProfile] handleLogout: signOut finished', {
              error: error?.message ?? null,
            });
            if (error) {
              Alert.alert('Error', error.message);
            }
          })();
        },
      },
    ]);
  };

  const calculateAge = (dob: Date | null) => {
    if (!dob) return 'Not set';
    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();
    let days = today.getDate() - dob.getDate();

    if (days < 0) {
      months--;
      // Get the last day of the previous month
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const ageParts = [];
    if (years > 0) {
      ageParts.push(`${years} year${years !== 1 ? 's' : ''}`);
    }
    if (months > 0) {
      ageParts.push(`${months} month${months !== 1 ? 's' : ''}`);
    }
    if (days > 0) {
      ageParts.push(`${days} day${days !== 1 ? 's' : ''}`);
    }

    return ageParts.join(', ') || 'Less than a day';
  };

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigation.goBack();
        return;
      }

      const { error } = await supabase
        .from('player_profiles')
        .upsert([{
          ...profile,
          user_id: user.id,
          dob: profile.dob?.toISOString() || '',
          batRoles: profile.batRoles,
          bowlRoles: profile.bowlRoles,
        }]);

      if (error) {
        console.error('Error saving profile:', error);
        return;
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const toggleBatRole = (role: string) => {
    setProfile(prev => {
      const roles = prev.batRoles ? prev.batRoles.split(',') : [];
      const newRoles = roles.includes(role)
        ? roles.filter(r => r !== role)
        : [...roles, role];
      return {
        ...prev,
        batRoles: newRoles.join(',')
      };
    });
  };

  const toggleBowlRole = (role: string) => {
    setProfile(prev => {
      const roles = prev.bowlRoles ? prev.bowlRoles.split(',') : [];
      const newRoles = roles.includes(role)
        ? roles.filter(r => r !== role)
        : [...roles, role];
      return {
        ...prev,
        bowlRoles: newRoles.join(',')
      };
    });
  };

  const handleImagePick = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo' as const,
      quality: 0.8,
      maxWidth: 500,
      maxHeight: 500,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        return;
      }

      if (response.errorCode) {
        Alert.alert('Error', 'Failed to pick image');
        return;
      }

      if (response.assets && response.assets[0]) {
        uploadImage(response.assets[0]);
      }
    });
  };

  const uploadImage = async (imageAsset: any) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigation.goBack();
        return;
      }

      // Convert image to blob
      const response = await fetch(imageAsset.uri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const fileExt = imageAsset.uri.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, blob);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('player_profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const renderProfileImage = () => (
    <View style={styles.profileImageContainer}>
      <View style={styles.profileImage}>
        {profile.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            style={styles.profileImageContent}
          />
        ) : (
          <IconButton
            icon="account"
            size={40}
            onPress={handleImagePick}
          />
        )}
        {isEditing && (
          <IconButton
            icon="camera"
            size={24}
            style={styles.cameraButton}
            onPress={handleImagePick}
          />
        )}
      </View>
      {uploading && (
        <ActivityIndicator style={styles.uploadIndicator} />
      )}
    </View>
  );

  const renderDisplayView = () => (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.formContainer}>
        {renderProfileImage()}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{profile.name}</Text>

            <Text style={styles.label}>Date of Birth</Text>
            <Text style={styles.value}>
              {profile.dob ? profile.dob.toLocaleDateString() : 'Not set'}
            </Text>

            <Text style={styles.label}>Age</Text>
            <Text style={styles.value}>{calculateAge(profile.dob)}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Playing Style</Text>
            <Text style={styles.label}>Batting Style</Text>
            <Text style={styles.value}>{profile.batStyle || 'Not set'}</Text>

            <Text style={styles.label}>Bowling Style</Text>
            <Text style={styles.value}>{profile.bowlStyle || 'Not set'}</Text>

            <Text style={styles.label}>Playing Role</Text>
            <Text style={styles.value}>{profile.playRole || 'Not set'}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Roles</Text>
            <Text style={styles.label}>Batting Roles</Text>
            <Text style={styles.value}>
              {profile.batRoles ? profile.batRoles.split(',').join(', ') : 'Not set'}
            </Text>

            <Text style={styles.label}>Bowling Roles</Text>
            <Text style={styles.value}>
              {profile.bowlRoles ? profile.bowlRoles.split(',').join(', ') : 'Not set'}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Favorites</Text>
            <Text style={styles.label}>Favorite Batters</Text>
            <Text style={styles.value}>{profile.favBatters || 'Not set'}</Text>

            <Text style={styles.label}>Favorite Bowlers</Text>
            <Text style={styles.value}>{profile.favBowlers || 'Not set'}</Text>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={() => setIsEditing(true)}
          style={styles.button}
        >
          Edit Profile
        </Button>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          onPress={() => {
            console.log('[CricketOS][PlayerProfile] Log out control pressed (Pressable)');
            handleLogout();
          }}
          style={({ pressed }) => [styles.logoutPressable, pressed && styles.logoutPressablePressed]}
        >
          <Text style={styles.logoutPressableText}>Log out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderEditView = () => (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.formContainer}>
        {renderProfileImage()}
        <TextInput
          label="Name"
          value={profile.name}
          onChangeText={(text) => setProfile({ ...profile, name: text })}
          style={styles.input}
        />

        <Button
          mode="outlined"
          onPress={() => setShowDatePicker(true)}
          style={styles.input}
        >
          {profile.dob ? profile.dob.toLocaleDateString() : 'Select Date of Birth'}
        </Button>
        {showDatePicker && (
          <DateTimePicker
            value={profile.dob || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setProfile({ ...profile, dob: selectedDate });
              }
            }}
          />
        )}

        <Text style={styles.ageText}>
          Age: {calculateAge(profile.dob)}
        </Text>

        <Text style={styles.sectionTitle}>Batting Style</Text>
        <View style={styles.chipGroup}>
          {BAT_STYLES.map((style) => (
            <Chip
              key={style}
              selected={profile.batStyle === style}
              onPress={() => setProfile({ ...profile, batStyle: style })}
              style={styles.chip}
            >
              {style}
            </Chip>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Bowling Style</Text>
        <View style={styles.chipGroup}>
          {BOWL_STYLES.map((style) => (
            <Chip
              key={style}
              selected={profile.bowlStyle === style}
              onPress={() => setProfile({ ...profile, bowlStyle: style })}
              style={styles.chip}
            >
              {style}
            </Chip>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Batting Roles</Text>
        <View style={styles.chipGroup}>
          {BAT_ROLES.map((role) => (
            <Chip
              key={role}
              selected={profile.batRoles.split(',').includes(role)}
              onPress={() => toggleBatRole(role)}
              style={styles.chip}
            >
              {role}
            </Chip>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Bowling Roles</Text>
        <View style={styles.chipGroup}>
          {BOWL_ROLES.map((role) => (
            <Chip
              key={role}
              selected={profile.bowlRoles.split(',').includes(role)}
              onPress={() => toggleBowlRole(role)}
              style={styles.chip}
            >
              {role}
            </Chip>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Playing Role</Text>
        <View style={styles.chipGroup}>
          {PLAY_ROLES.map((role) => (
            <Chip
              key={role}
              selected={profile.playRole === role}
              onPress={() => setProfile({ ...profile, playRole: role })}
              style={styles.chip}
            >
              {role}
            </Chip>
          ))}
        </View>

        <TextInput
          label="Favorite Batters"
          value={profile.favBatters}
          onChangeText={(text) => setProfile({ ...profile, favBatters: text })}
          multiline
          style={styles.input}
        />

        <TextInput
          label="Favorite Bowlers"
          value={profile.favBowlers}
          onChangeText={(text) => setProfile({ ...profile, favBowlers: text })}
          multiline
          style={styles.input}
        />

        <Button mode="contained" onPress={handleSaveProfile} style={styles.button}>
          Save Profile
        </Button>
        <Button mode="outlined" onPress={() => setIsEditing(false)} style={styles.button}>
          Cancel
        </Button>
      </View>
    </ScrollView>
  );

  return isEditing ? renderEditView() : renderDisplayView();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  formContainer: {
    padding: 16,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImageContent: {
    width: '100%',
    height: '100%',
  },
  input: {
    marginBottom: 16,
  },
  ageText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
  },
  logoutPressable: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c62828',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutPressablePressed: {
    opacity: 0.75,
  },
  logoutPressableText: {
    color: '#c62828',
    fontSize: 15,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  value: {
    fontSize: 16,
    marginBottom: 8,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    margin: 0,
  },
  uploadIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
  },
}); 