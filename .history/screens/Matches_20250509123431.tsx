import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, StatusBar, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { Button, Text, Card, FAB, Portal, Dialog, TextInput, IconButton, Switch } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

interface Match {
  id: string;
  date: string;
  opponent: string;
  venue: string;
  competition?: string;
  result: string;
  match_format: 'T20' | 'ODI' | 'T10' | 'Other';
  other_format?: string;
  batting: {
    position: number;
    runs: number;
    balls: number;
    singles: number;
    doubles: number;
    triples: number;
    fours: number;
    sixes: number;
    dots: number;
    not_out: boolean;
    how_out?: 'Bowled' | 'LBW' | 'Stumped' | 'C&B' | 'Caught Behind' | 'Caught' | 'Run Out' | 'Hit Wicket';
    shot_out?: string;
    error_type?: 'Mental' | 'Execution';
    bowler_type?: 'LAO' | 'RAOS' | 'RAWS' | 'LAWS' | 'LAP' | 'RAP';
  };
  bowling: {
    position: number;
    balls: number;
    runs: number;
    maidens: number;
    wickets: number;
    dots: number;
    fours: number;
    sixes: number;
  };
  fielding: {
    infield_catches: number;
    boundary_catches: number;
    direct_runouts: number;
    indirect_runouts: number;
    drops: number;
    player_of_match: boolean;
  };
  source: 'manual' | 'cricclubs';
  batting_notes?: string;
  bowling_notes?: string;
  dot_percentage: number;
  strike_rate: number;
  boundary_percentage: number;
  balls_per_boundary: number | null;
  bowling_wides: number;
  bowling_noballs: number;
  bowling_economy: number;
  bowling_dot_percentage: number;
  bowling_balls_per_boundary: number | null;
}

export default function Matches() {
  const navigation = useNavigation<NavigationProp>();
  const route = useNavigationState(state => state?.routes[state.index]);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newMatch, setNewMatch] = useState<Partial<Match>>({
    date: new Date().toISOString().split('T')[0],
    match_format: 'T20',
    batting: { 
      position: 0, 
      runs: 0, 
      balls: 0, 
      singles: 0,
      doubles: 0,
      triples: 0,
      fours: 0, 
      sixes: 0, 
      dots: 0, 
      not_out: false,
      how_out: undefined,
      shot_out: undefined,
      error_type: undefined,
      bowler_type: undefined
    },
    bowling: { position: 0, balls: 0, runs: 0, maidens: 0, wickets: 0, dots: 0, fours: 0, sixes: 0 },
    fielding: { infield_catches: 0, boundary_catches: 0, direct_runouts: 0, indirect_runouts: 0, drops: 0, player_of_match: false },
    source: 'manual',
    bowling_wides: 0,
    bowling_noballs: 0,
    batting_notes: '',
    bowling_notes: '',
    competition: ''
  });
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (route?.params?.selectedMatchId) {
      const match = matches.find(m => m.id === route.params.selectedMatchId);
      if (match) {
        setSelectedMatch(match);
      }
    }
  }, [route?.params?.selectedMatchId, matches]);

  const fetchMatches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigation.goBack();
        return;
      }

      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching matches:', error);
        return;
      }

      setMatches(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    Alert.alert(
      'Delete Match',
      'Are you sure you want to delete this match?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('matches')
              .delete()
              .eq('id', matchId);

            if (error) {
              console.error('Error deleting match:', error);
              Alert.alert('Error', 'Failed to delete the match');
              return;
            }

            // Update local state
            setMatches(matches.filter(match => match.id !== matchId));
          },
        },
      ],
    );
  };

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
    setNewMatch({
      date: match.date,
      opponent: match.opponent,
      venue: match.venue,
      competition: match.competition,
      result: match.result,
      batting: match.batting,
      bowling: match.bowling,
      fielding: match.fielding,
      source: match.source,
      batting_notes: match.batting_notes,
      bowling_notes: match.bowling_notes,
    });
    setShowAddDialog(true);
  };

  const handleAddMatch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigation.goBack();
        return;
      }

      if (editingMatch) {
        // Update existing match
        const { error } = await supabase
          .from('matches')
          .update({
            ...newMatch,
            user_id: user.id
          })
          .eq('id', editingMatch.id);

        if (error) {
          console.error('Error updating match:', error);
          return;
        }
      } else {
        // Add new match
        const { error } = await supabase
          .from('matches')
          .insert([{
            ...newMatch,
            user_id: user.id
          }]);

        if (error) {
          console.error('Error adding match:', error);
          return;
        }
      }

      setShowAddDialog(false);
      setEditingMatch(null);
      setNewMatch({
        date: new Date().toISOString().split('T')[0],
        match_format: 'T20',
        batting: { 
          position: 0, 
          runs: 0, 
          balls: 0, 
          singles: 0,
          doubles: 0,
          triples: 0,
          fours: 0, 
          sixes: 0, 
          dots: 0, 
          not_out: false,
          how_out: undefined,
          shot_out: undefined,
          error_type: undefined,
          bowler_type: undefined
        },
        bowling: { position: 0, balls: 0, runs: 0, maidens: 0, wickets: 0, dots: 0, fours: 0, sixes: 0 },
        fielding: { infield_catches: 0, boundary_catches: 0, direct_runouts: 0, indirect_runouts: 0, drops: 0, player_of_match: false },
        source: 'manual',
        bowling_wides: 0,
        bowling_noballs: 0,
        batting_notes: '',
        bowling_notes: '',
        competition: ''
      });
      fetchMatches();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  }, []);

  const ballsToOvers = (balls: number): string => {
    const fullOvers = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return remainingBalls === 0 ? fullOvers.toString() : `${fullOvers}.${remainingBalls}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}-${month}-${date.getFullYear()}`;
  };

  const renderMatchListItem = (match: Match) => (
    <TouchableOpacity
      key={match.id}
      style={[
        styles.matchListItem,
        selectedMatch?.id === match.id && styles.selectedMatchListItem
      ]}
      onPress={() => setSelectedMatch(match)}
    >
      <Text style={styles.matchListDate}>
        {formatDate(match.date)}
      </Text>
      <Text style={styles.matchListOpponent} numberOfLines={1}>
        vs <Text style={styles.matchListOpponentName}>{match.opponent}</Text>
      </Text>
      <Text style={styles.matchListFormat}>
        {match.match_format === 'Other' ? match.other_format : match.match_format}
      </Text>
    </TouchableOpacity>
  );

  const renderMatchDetail = (match: Match) => (
    <Card style={styles.detailCard}>
      <Card.Content>
        <View style={styles.matchHeader}>
          <Text style={styles.date}>{formatDate(match.date)}</Text>
          <View style={styles.matchActions}>
            <IconButton
              icon="pencil"
              size={20}
              onPress={() => handleEditMatch(match)}
            />
            <IconButton
              icon="delete"
              size={20}
              onPress={() => handleDeleteMatch(match.id)}
            />
          </View>
        </View>
        <Text style={styles.matchDetails}>
          {match.match_format === 'Other' ? match.other_format : match.match_format} at {match.venue} vs <Text style={styles.opponentName}>{match.opponent}</Text>
          {match.competition && ` - ${match.competition}`}
        </Text>
        <Text style={styles.result}>{match.result}</Text>
        
        <View style={styles.statsContainer}>
          {/* Batting Stats */}
          <View style={styles.statSection}>
            <Text style={styles.statTitle}>Batting</Text>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{match.batting.runs} ({match.batting.balls})</Text>
              <View style={styles.runTypeContainer}>
                <Text style={styles.runTypeText}>1s: {match.batting.singles}</Text>
                <Text style={styles.runTypeText}>2s: {match.batting.doubles}</Text>
                <Text style={styles.runTypeText}>3s: {match.batting.triples}</Text>
              </View>
              <Text style={styles.statValue}>4s: {match.batting.fours} | 6s: {match.batting.sixes}</Text>
              {match.batting.not_out ? (
                <Text style={styles.statValue}>Not Out</Text>
              ) : (
                <View style={styles.dismissalDetails}>
                  <Text style={styles.statValue}>Out: {match.batting.how_out}</Text>
                  {match.batting.shot_out && <Text style={styles.statValue}>Shot: {match.batting.shot_out}</Text>}
                  {match.batting.error_type && <Text style={styles.statValue}>Error: {match.batting.error_type}</Text>}
                  {match.batting.bowler_type && <Text style={styles.statValue}>Bowler: {match.batting.bowler_type}</Text>}
                </View>
              )}
              <View style={styles.metricsContainer}>
                <Text style={styles.metricText}>Dot %: {match.dot_percentage}%</Text>
                <Text style={styles.metricText}>SR: {match.strike_rate}</Text>
                <Text style={styles.metricText}>Boundary %: {match.boundary_percentage}%</Text>
                <Text style={styles.metricText}>Balls/Boundary: {match.balls_per_boundary || '-'}</Text>
              </View>
            </View>
          </View>

          {/* Bowling Stats */}
          <View style={styles.statSection}>
            <Text style={styles.statTitle}>Bowling</Text>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>
                {ballsToOvers(match.bowling.balls)}-{match.bowling.maidens}-{match.bowling.runs}-{match.bowling.wickets}
              </Text>
              <Text style={styles.statValue}>Wides: {match.bowling_wides} | No Balls: {match.bowling_noballs}</Text>
              <View style={styles.metricsContainer}>
                <Text style={styles.metricText}>Economy: {match.bowling_economy}</Text>
                <Text style={styles.metricText}>Dot %: {match.bowling_dot_percentage}%</Text>
                <Text style={styles.metricText}>Balls/Boundary: {match.bowling_balls_per_boundary || '-'}</Text>
              </View>
            </View>
          </View>

          {/* Fielding Stats */}
          <View style={styles.statSection}>
            <Text style={styles.statTitle}>Fielding</Text>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>Infield catches: {match.fielding.infield_catches}</Text>
              <Text style={styles.statValue}>Bdry catches: {match.fielding.boundary_catches}</Text>
              <Text style={styles.statValue}>Direct RO: {match.fielding.direct_runouts}</Text>
              <Text style={styles.statValue}>Indirect RO: {match.fielding.indirect_runouts}</Text>
              <Text style={styles.statValue}>Drops: {match.fielding.drops}</Text>
            </View>
          </View>
        </View>

        {match.fielding.player_of_match && (
          <View style={styles.playerOfMatchContainer}>
            <Text style={styles.playerOfMatchText}>Awarded Player of the Match</Text>
          </View>
        )}

        {match.batting_notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesTitle}>Batting Notes</Text>
            <Text>{match.batting_notes}</Text>
          </View>
        )}
        {match.bowling_notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesTitle}>Bowling Notes</Text>
            <Text>{match.bowling_notes}</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const renderAddMatchForm = () => (
    <Dialog 
      visible={showAddDialog} 
      onDismiss={() => {
        setShowAddDialog(false);
        setEditingMatch(null);
        setNewMatch({
          date: new Date().toISOString().split('T')[0],
          match_format: 'T20',
          batting: { 
            position: 0, 
            runs: 0, 
            balls: 0, 
            singles: 0,
            doubles: 0,
            triples: 0,
            fours: 0, 
            sixes: 0, 
            dots: 0, 
            not_out: false,
            how_out: undefined,
            shot_out: undefined,
            error_type: undefined,
            bowler_type: undefined
          },
          bowling: { position: 0, balls: 0, runs: 0, maidens: 0, wickets: 0, dots: 0, fours: 0, sixes: 0 },
          fielding: { infield_catches: 0, boundary_catches: 0, direct_runouts: 0, indirect_runouts: 0, drops: 0, player_of_match: false },
          source: 'manual',
          bowling_wides: 0,
          bowling_noballs: 0,
          batting_notes: '',
          bowling_notes: '',
          competition: ''
        });
      }}
      style={styles.dialog}
    >
      <Dialog.Title>{editingMatch ? 'Edit Match' : 'Add New Match'}</Dialog.Title>
      <Dialog.ScrollArea>
        <ScrollView contentContainerStyle={styles.dialogContent}>
          <Text style={styles.sectionTitle}>Match Details</Text>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={styles.input}
          >
            {newMatch.date ? new Date(newMatch.date).toLocaleDateString() : 'Select Date'}
          </Button>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(newMatch.date || new Date())}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setNewMatch({ ...newMatch, date: selectedDate.toISOString().split('T')[0] });
                }
              }}
            />
          )}
          <View style={styles.formatContainer}>
            <Text style={styles.formatLabel}>Format:</Text>
            <View style={styles.formatButtons}>
              {['T20', 'ODI', 'T10', 'Other'].map((format) => (
                <Button
                  key={format}
                  mode={newMatch.match_format === format ? 'contained' : 'outlined'}
                  onPress={() => setNewMatch({ 
                    ...newMatch, 
                    match_format: format as Match['match_format'],
                    other_format: format === 'Other' ? newMatch.other_format : undefined
                  })}
                  style={styles.formatButton}
                >
                  {format}
                </Button>
              ))}
            </View>
          </View>
          {newMatch.match_format === 'Other' && (
            <TextInput
              label="Specify Format"
              value={newMatch.other_format}
              onChangeText={(text) => setNewMatch({ ...newMatch, other_format: text })}
              style={styles.input}
            />
          )}
          <TextInput
            label="Opponent"
            value={newMatch.opponent}
            onChangeText={(text) => setNewMatch({ ...newMatch, opponent: text })}
            style={styles.input}
          />
          <TextInput
            label="Venue"
            value={newMatch.venue}
            onChangeText={(text) => setNewMatch({ ...newMatch, venue: text })}
            style={styles.input}
          />
          <TextInput
            label="Competition"
            value={newMatch.competition}
            onChangeText={(text) => setNewMatch({ ...newMatch, competition: text })}
            style={styles.input}
          />
          <TextInput
            label="Result"
            value={newMatch.result}
            onChangeText={(text) => setNewMatch({ ...newMatch, result: text })}
            style={styles.input}
          />

          <Text style={styles.sectionTitle}>Batting</Text>
          <TextInput
            label="Position"
            value={newMatch.batting?.position.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              batting: { ...newMatch.batting!, position: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Runs"
            value={newMatch.batting?.runs.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              batting: { ...newMatch.batting!, runs: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Balls"
            value={newMatch.batting?.balls.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              batting: { ...newMatch.batting!, balls: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />

          <Text style={styles.subSectionTitle}>Run Types</Text>
          <View style={styles.runTypesContainer}>
            <TextInput
              label="Singles"
              value={newMatch.batting?.singles?.toString()}
              onChangeText={(text) => setNewMatch({
                ...newMatch,
                batting: { ...newMatch.batting!, singles: parseInt(text) || 0 }
              })}
              keyboardType="numeric"
              style={styles.runTypeInput}
            />
            <TextInput
              label="Doubles"
              value={newMatch.batting?.doubles?.toString()}
              onChangeText={(text) => setNewMatch({
                ...newMatch,
                batting: { ...newMatch.batting!, doubles: parseInt(text) || 0 }
              })}
              keyboardType="numeric"
              style={styles.runTypeInput}
            />
            <TextInput
              label="Triples"
              value={newMatch.batting?.triples?.toString()}
              onChangeText={(text) => setNewMatch({
                ...newMatch,
                batting: { ...newMatch.batting!, triples: parseInt(text) || 0 }
              })}
              keyboardType="numeric"
              style={styles.runTypeInput}
            />
          </View>

          <Text style={styles.subSectionTitle}>Boundaries</Text>
          <View style={styles.runTypesContainer}>
            <TextInput
              label="Fours (4s)"
              value={newMatch.batting?.fours.toString()}
              onChangeText={(text) => setNewMatch({
                ...newMatch,
                batting: { ...newMatch.batting!, fours: parseInt(text) || 0 }
              })}
              keyboardType="numeric"
              style={styles.runTypeInput}
            />
            <TextInput
              label="Sixes (6s)"
              value={newMatch.batting?.sixes.toString()}
              onChangeText={(text) => setNewMatch({
                ...newMatch,
                batting: { ...newMatch.batting!, sixes: parseInt(text) || 0 }
              })}
              keyboardType="numeric"
              style={styles.runTypeInput}
            />
          </View>
          <TextInput
            label="Dots"
            value={newMatch.batting?.dots.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              batting: { ...newMatch.batting!, dots: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />
          <View style={styles.switchContainer}>
            <Text>Not Out</Text>
            <Switch
              value={newMatch.batting?.not_out}
              onValueChange={(value) => setNewMatch({
                ...newMatch,
                batting: { ...newMatch.batting!, not_out: value }
              })}
            />
          </View>

          {!newMatch.batting?.not_out && (
            <>
              <Text style={styles.sectionTitle}>Dismissal Details</Text>
              <View style={styles.formatContainer}>
                <Text style={styles.formatLabel}>How Out:</Text>
                <View style={styles.formatButtons}>
                  {['Bowled', 'LBW', 'Stumped', 'C&B', 'Caught Behind', 'Caught', 'Run Out', 'Hit Wicket'].map((outType) => (
                    <Button
                      key={outType}
                      mode={newMatch.batting?.how_out === outType ? 'contained' : 'outlined'}
                      onPress={() => setNewMatch({
                        ...newMatch,
                        batting: { ...newMatch.batting!, how_out: outType as Match['batting']['how_out'] }
                      })}
                      style={styles.formatButton}
                    >
                      {outType}
                    </Button>
                  ))}
                </View>
              </View>

              <TextInput
                label="Shot Out"
                value={newMatch.batting?.shot_out}
                onChangeText={(text) => setNewMatch({
                  ...newMatch,
                  batting: { ...newMatch.batting!, shot_out: text }
                })}
                style={styles.input}
              />

              <View style={styles.formatContainer}>
                <Text style={styles.formatLabel}>Error Type:</Text>
                <View style={styles.formatButtons}>
                  {['Mental', 'Execution'].map((errorType) => (
                    <Button
                      key={errorType}
                      mode={newMatch.batting?.error_type === errorType ? 'contained' : 'outlined'}
                      onPress={() => setNewMatch({
                        ...newMatch,
                        batting: { ...newMatch.batting!, error_type: errorType as Match['batting']['error_type'] }
                      })}
                      style={styles.formatButton}
                    >
                      {errorType}
                    </Button>
                  ))}
                </View>
              </View>

              <View style={styles.formatContainer}>
                <Text style={styles.formatLabel}>Bowler Type:</Text>
                <View style={styles.formatButtons}>
                  {['LAO', 'RAOS', 'RAWS', 'LAWS', 'LAP', 'RAP'].map((bowlerType) => (
                    <Button
                      key={bowlerType}
                      mode={newMatch.batting?.bowler_type === bowlerType ? 'contained' : 'outlined'}
                      onPress={() => setNewMatch({
                        ...newMatch,
                        batting: { ...newMatch.batting!, bowler_type: bowlerType as Match['batting']['bowler_type'] }
                      })}
                      style={styles.formatButton}
                    >
                      {bowlerType}
                    </Button>
                  ))}
                </View>
              </View>
            </>
          )}

          <Text style={styles.sectionTitle}>Bowling</Text>
          <TextInput
            label="Position"
            value={newMatch.bowling?.position.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              bowling: { ...newMatch.bowling!, position: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Balls"
            value={newMatch.bowling?.balls.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              bowling: { ...newMatch.bowling!, balls: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Runs"
            value={newMatch.bowling?.runs.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              bowling: { ...newMatch.bowling!, runs: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Maidens"
            value={newMatch.bowling?.maidens.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              bowling: { ...newMatch.bowling!, maidens: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Wickets"
            value={newMatch.bowling?.wickets.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              bowling: { ...newMatch.bowling!, wickets: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Dots"
            value={newMatch.bowling?.dots.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              bowling: { ...newMatch.bowling!, dots: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="4s Conceded"
            value={newMatch.bowling?.fours.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              bowling: { ...newMatch.bowling!, fours: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="6s Conceded"
            value={newMatch.bowling?.sixes.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              bowling: { ...newMatch.bowling!, sixes: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />

          <Text style={styles.sectionTitle}>Fielding</Text>
          <TextInput
            label="Infield catches"
            value={newMatch.fielding?.infield_catches.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              fielding: { ...newMatch.fielding!, infield_catches: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Bdry catches"
            value={newMatch.fielding?.boundary_catches.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              fielding: { ...newMatch.fielding!, boundary_catches: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Direct RO"
            value={newMatch.fielding?.direct_runouts.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              fielding: { ...newMatch.fielding!, direct_runouts: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Indirect RO"
            value={newMatch.fielding?.indirect_runouts.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              fielding: { ...newMatch.fielding!, indirect_runouts: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Drops"
            value={newMatch.fielding?.drops.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              fielding: { ...newMatch.fielding!, drops: parseInt(text) || 0 }
            })}
            keyboardType="numeric"
            style={styles.input}
          />
          <View style={styles.switchContainer}>
            <Text>Player of the Match</Text>
            <Switch
              value={newMatch.fielding?.player_of_match}
              onValueChange={(value) => setNewMatch({
                ...newMatch,
                fielding: { ...newMatch.fielding!, player_of_match: value }
              })}
            />
          </View>

          <Text style={styles.sectionTitle}>Bowling Extras</Text>
          <TextInput
            label="Wides"
            value={newMatch.bowling_wides?.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              bowling_wides: parseInt(text) || 0
            })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="No Balls"
            value={newMatch.bowling_noballs?.toString()}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              bowling_noballs: parseInt(text) || 0
            })}
            keyboardType="numeric"
            style={styles.input}
          />

          <TextInput
            label="Batting Notes"
            value={newMatch.batting_notes}
            onChangeText={(text) => setNewMatch({ ...newMatch, batting_notes: text })}
            multiline
            style={styles.input}
          />
          <TextInput
            label="Bowling Notes"
            value={newMatch.bowling_notes}
            onChangeText={(text) => setNewMatch({ ...newMatch, bowling_notes: text })}
            multiline
            style={styles.input}
          />
        </ScrollView>
      </Dialog.ScrollArea>
      <Dialog.Actions>
        <Button onPress={() => {
          setShowAddDialog(false);
          setEditingMatch(null);
          setNewMatch({
            date: new Date().toISOString().split('T')[0],
            match_format: 'T20',
            batting: { 
              position: 0, 
              runs: 0, 
              balls: 0, 
              singles: 0,
              doubles: 0,
              triples: 0,
              fours: 0, 
              sixes: 0, 
              dots: 0, 
              not_out: false,
              how_out: undefined,
              shot_out: undefined,
              error_type: undefined,
              bowler_type: undefined
            },
            bowling: { position: 0, balls: 0, runs: 0, maidens: 0, wickets: 0, dots: 0, fours: 0, sixes: 0 },
            fielding: { infield_catches: 0, boundary_catches: 0, direct_runouts: 0, indirect_runouts: 0, drops: 0, player_of_match: false },
            source: 'manual',
            bowling_wides: 0,
            bowling_noballs: 0,
            batting_notes: '',
            bowling_notes: '',
            competition: ''
          });
        }}>Cancel</Button>
        <Button onPress={handleAddMatch}>{editingMatch ? 'Save' : 'Add'}</Button>
      </Dialog.Actions>
    </Dialog>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matches</Text>
        <IconButton
          icon="account"
          size={24}
          onPress={() => navigation.navigate('PlayerProfile')}
        />
      </View>
      
      <View style={styles.contentContainer}>
        {/* Center Detail View */}
        <View style={styles.detailContainer}>
          {selectedMatch ? (
            <ScrollView 
              style={styles.detailScroll}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#2196F3']}
                  tintColor="#2196F3"
                />
              }
            >
              {renderMatchDetail(selectedMatch)}
            </ScrollView>
          ) : (
            <View style={styles.noSelectionContainer}>
              <Text style={styles.noSelectionText}>Select a match from the list</Text>
            </View>
          )}
        </View>

        {/* Right Side List */}
        <View style={styles.listContainer}>
          <ScrollView style={styles.matchList}>
            {matches.map(renderMatchListItem)}
          </ScrollView>
        </View>
      </View>

      {renderAddMatchForm()}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          setEditingMatch(null);
          setShowAddDialog(true);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  detailContainer: {
    width: '70%',
    paddingHorizontal: 24,
    backgroundColor: 'white',
  },
  detailScroll: {
    flex: 1,
  },
  listContainer: {
    width: '30%',
    backgroundColor: '#f8f8f8',
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  matchList: {
    flex: 1,
  },
  matchListItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedMatchListItem: {
    backgroundColor: '#e3f2fd',
  },
  matchListDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  matchListOpponent: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
  },
  matchListOpponentName: {
    fontWeight: 'bold',
  },
  matchListFormat: {
    fontSize: 11,
    color: '#888',
  },
  noSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSelectionText: {
    fontSize: 16,
    color: '#666',
  },
  detailCard: {
    marginVertical: 16,
    elevation: 2,
    marginHorizontal: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'column',
    gap: 16,
    marginTop: 16,
  },
  statSection: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statContent: {
    gap: 8,
  },
  statValue: {
    fontSize: 14,
    color: '#444',
  },
  metricsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  metricText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  runTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 12,
    marginVertical: 8,
  },
  runTypeText: {
    fontSize: 13,
    color: '#444',
  },
  dismissalDetails: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 4,
    gap: 6,
    marginTop: 8,
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  input: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dialog: {
    maxHeight: '90%',
  },
  dialogContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchActions: {
    flexDirection: 'row',
  },
  playerOfMatchContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
    alignItems: 'center',
  },
  playerOfMatchText: {
    color: '#1976d2',
    fontWeight: 'bold',
    fontSize: 16,
  },
  formatContainer: {
    marginBottom: 16,
  },
  formatLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  formatButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formatButton: {
    flex: 1,
    minWidth: 80,
  },
  format: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
  },
  runTypesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  runTypeInput: {
    flex: 1,
    minWidth: 100,
  },
  date: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  matchDetails: {
    fontSize: 15,
    marginVertical: 4,
    color: '#333',
  },
  opponentName: {
    fontWeight: '600',
  },
  result: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
}); 