import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, StatusBar, Alert, RefreshControl, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Text, Card, FAB, Portal, Dialog, TextInput, IconButton, Switch, Searchbar, Menu } from 'react-native-paper';
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
  other_notes?: string;
  dot_percentage: number;
  strike_rate: number;
  boundary_percentage: number;
  balls_per_boundary: number | null;
  bowling_wides: number;
  bowling_noballs: number;
  bowling_economy: number;
  bowling_dot_percentage: number;
  bowling_balls_per_boundary: number | null;
  team_runs?: number;
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
    other_notes: '',
    competition: '',
    team_runs: undefined
  });
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [dropdownVisible, setDropdownVisible] = useState<'opponent' | 'venue' | 'competition' | 'result' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [minRunsFilter, setMinRunsFilter] = useState<string>('');
  const [minWicketsFilter, setMinWicketsFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'fantasy'>('date');

  const matchOptions = useMemo(() => {
    const opponents = [...new Set(matches.map(m => m.opponent).filter(Boolean))].sort();
    const venues = [...new Set(matches.map(m => m.venue).filter(Boolean))].sort();
    const comps = [...new Set(matches.map(m => m.competition).filter(Boolean))].sort();
    const results = [...new Set(matches.map(m => m.result).filter(Boolean))].sort();
    return { opponents, venues, comps, results };
  }, [matches]);

  const getStrikeRatePoints = (sr: number, isODI: boolean): number => {
    if (isODI) {
      if (sr < 40) return -15;
      if (sr < 56) return -10;
      if (sr < 75) return -5;
      if (sr < 90) return 0;
      if (sr < 112) return 5;
      if (sr < 131) return 10;
      if (sr < 150) return 15;
      if (sr < 170) return 20;
      return 25;
    }
    if (sr < 50) return -15;
    if (sr < 75) return -10;
    if (sr < 100) return -5;
    if (sr <= 100) return 0;
    if (sr < 120) return 5;
    if (sr < 150) return 10;
    if (sr < 175) return 15;
    if (sr < 200) return 20;
    return 25;
  };

  const getFantasyPoints = (match: Match): { total: number; batting: number; bowling: number; fielding: number } => {
    const format = match.match_format || 'T20';
    const isODI = format === 'ODI';
    const battingBalls = match.batting?.balls ?? 0;
    const bowlingBalls = match.bowling?.balls ?? 0;

    let batting = 0;
    const runs = match.batting?.runs ?? 0;
    const fours = match.batting?.fours ?? 0;
    const sixes = match.batting?.sixes ?? 0;
    const notOut = match.batting?.not_out ?? false;
    batting += runs;
    batting += fours * 2;
    batting += sixes * 4;
    if (runs >= 100) batting += 50;
    else if (runs >= 50) batting += 25;
    if (runs === 0 && !notOut) batting -= 5;
    if (battingBalls > 10) {
      const strikeRate = match.strike_rate ?? 0;
      if (strikeRate > 0) {
        batting += getStrikeRatePoints(strikeRate, isODI);
      }
      const dotBaseline = isODI ? 60 : 40;
      const dotPct = match.dot_percentage ?? 0;
      if (dotPct > 0) {
        batting += Math.round((dotBaseline - dotPct) * 1);
      }
      const bpbBaseline = isODI ? 11 : 6;
      const bpb = match.balls_per_boundary ?? 0;
      if (bpb > 0) {
        batting += Math.round((bpbBaseline - bpb) * 10);
      }
    }

    let bowling = 0;
    const wickets = match.bowling?.wickets ?? 0;
    const runsConceded = match.bowling?.runs ?? 0;
    const maidens = match.bowling?.maidens ?? 0;
    bowling += wickets * 25;
    bowling -= runsConceded;
    bowling += maidens * 10;
    if (bowlingBalls > 6) {
      const economy = match.bowling_economy ?? 0;
      if (economy > 0) {
        const econLow = isODI ? 6 : 7;
        const econHigh = isODI ? 7 : 8;
        if (economy < econLow) bowling += Math.round((econLow - economy) * 10);
        else if (economy > econHigh) bowling += Math.round((econHigh - economy) * 10);
      }
    }

    let fielding = 0;
    const infieldCatches = match.fielding?.infield_catches ?? 0;
    const boundaryCatches = match.fielding?.boundary_catches ?? 0;
    const directRO = match.fielding?.direct_runouts ?? 0;
    const indirectRO = match.fielding?.indirect_runouts ?? 0;
    const drops = match.fielding?.drops ?? 0;
    fielding += (infieldCatches + boundaryCatches) * 10;
    fielding += directRO * 15;
    fielding += indirectRO * 10;
    fielding -= drops * 10;
    if (match.fielding?.player_of_match) fielding += 25;
    return { total: batting + bowling + fielding, batting, bowling, fielding };
  };

  const filteredMatches = useMemo(() => {
    let list = matches;
    const minRuns = minRunsFilter.trim() ? parseInt(minRunsFilter, 10) : 0;
    if (!isNaN(minRuns) && minRuns > 0) {
      list = list.filter(m => (m.batting?.runs ?? 0) >= minRuns);
    }
    const minWickets = minWicketsFilter.trim() ? parseInt(minWicketsFilter, 10) : 0;
    if (!isNaN(minWickets) && minWickets > 0) {
      list = list.filter(m => (m.bowling?.wickets ?? 0) >= minWickets);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m =>
        (m.opponent && m.opponent.toLowerCase().includes(q)) ||
        (m.venue && m.venue.toLowerCase().includes(q)) ||
        (m.result && m.result.toLowerCase().includes(q)) ||
        (m.competition && m.competition.toLowerCase().includes(q)) ||
        (m.date && m.date.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'fantasy') {
      list = [...list].sort((a, b) => getFantasyPoints(b).total - getFantasyPoints(a).total);
    }
    return list;
  }, [matches, searchQuery, minRunsFilter, minWicketsFilter, sortBy]);

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
      other_notes: match.other_notes,
      team_runs: match.team_runs,
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
        other_notes: '',
        competition: '',
        team_runs: undefined
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

  const renderMatchListItem = (match: Match) => {
    const fp = getFantasyPoints(match).total;
    return (
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
        <Text style={styles.matchListFantasy}>{fp} pts</Text>
      </TouchableOpacity>
    );
  };

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
          {match.match_format === 'Other' ? match.other_format : match.match_format} at {match.venue} vs{' '}
          <Text style={styles.opponentNameBold}>{match.opponent}</Text>
          {match.competition && ` - ${match.competition}`}
        </Text>
        <Text style={styles.result}>{match.result}</Text>

        {/* Fantasy points / contribution rank */}
        {(() => {
          const fp = getFantasyPoints(match);
          return (
            <View style={styles.fantasySection}>
              <Text style={styles.fantasyTitle}>Contribution (Fantasy points)</Text>
              <Text style={styles.fantasyTotal}>{fp.total} pts</Text>
              <View style={styles.fantasyBreakdown}>
                <Text style={styles.fantasyBreakdownText}>Batting: {fp.batting}</Text>
                <Text style={styles.fantasyBreakdownText}>Bowling: {fp.bowling}</Text>
                <Text style={styles.fantasyBreakdownText}>Fielding: {fp.fielding}</Text>
              </View>
            </View>
          );
        })()}
        
        <View style={styles.statsContainer}>
          {/* Batting Stats */}
          <View style={styles.statSection}>
            <Text style={styles.statTitle}>Batting</Text>
            <View style={styles.statContent}>
              {match.team_runs != null && match.team_runs > 0 ? (
                <>
                  <Text style={styles.statValue}>
                    {match.batting.runs} ({match.batting.balls}) — {((match.batting.runs / match.team_runs) * 100).toFixed(1)}% of team
                  </Text>
                  <Text style={styles.runTypeText}>Team total: {match.team_runs}</Text>
                </>
              ) : (
                <Text style={styles.statValue}>{match.batting.runs} ({match.batting.balls})</Text>
              )}
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
        {match.other_notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesTitle}>Other Notes (Fielding, Captaincy)</Text>
            <Text>{match.other_notes}</Text>
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
        other_notes: '',
        competition: '',
        team_runs: undefined
        });
      }}
      style={styles.dialog}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.dialogKeyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <Dialog.Title>{editingMatch ? 'Edit Match' : 'Add New Match'}</Dialog.Title>
        <Dialog.ScrollArea style={styles.dialogScrollArea}>
          <ScrollView
            contentContainerStyle={styles.dialogContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
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
          <View style={styles.dropdownInputRow}>
            <TextInput
              label="Opponent"
              value={newMatch.opponent ?? ''}
              onChangeText={(text) => setNewMatch({ ...newMatch, opponent: text })}
              style={[styles.input, styles.dropdownTextInput]}
            />
            <Menu
              visible={dropdownVisible === 'opponent'}
              onDismiss={() => setDropdownVisible(null)}
              anchor={<IconButton icon="chevron-down" onPress={() => setDropdownVisible('opponent')} />}
            >
              {matchOptions.opponents.map((o) => (
                <Menu.Item key={o} onPress={() => { setNewMatch({ ...newMatch, opponent: o }); setDropdownVisible(null); }} title={o} />
              ))}
            </Menu>
          </View>
          <View style={styles.dropdownInputRow}>
            <TextInput
              label="Venue"
              value={newMatch.venue ?? ''}
              onChangeText={(text) => setNewMatch({ ...newMatch, venue: text })}
              style={[styles.input, styles.dropdownTextInput]}
            />
            <Menu
              visible={dropdownVisible === 'venue'}
              onDismiss={() => setDropdownVisible(null)}
              anchor={<IconButton icon="chevron-down" onPress={() => setDropdownVisible('venue')} />}
            >
              {matchOptions.venues.map((v) => (
                <Menu.Item key={v} onPress={() => { setNewMatch({ ...newMatch, venue: v }); setDropdownVisible(null); }} title={v} />
              ))}
            </Menu>
          </View>
          <View style={styles.dropdownInputRow}>
            <TextInput
              label="Competition"
              value={newMatch.competition ?? ''}
              onChangeText={(text) => setNewMatch({ ...newMatch, competition: text })}
              style={[styles.input, styles.dropdownTextInput]}
            />
            <Menu
              visible={dropdownVisible === 'competition'}
              onDismiss={() => setDropdownVisible(null)}
              anchor={<IconButton icon="chevron-down" onPress={() => setDropdownVisible('competition')} />}
            >
              {matchOptions.comps.map((c) => (
                <Menu.Item key={c} onPress={() => { setNewMatch({ ...newMatch, competition: c }); setDropdownVisible(null); }} title={c} />
              ))}
            </Menu>
          </View>
          <View style={styles.dropdownInputRow}>
            <TextInput
              label="Result"
              value={newMatch.result ?? ''}
              onChangeText={(text) => setNewMatch({ ...newMatch, result: text })}
              style={[styles.input, styles.dropdownTextInput]}
            />
            <Menu
              visible={dropdownVisible === 'result'}
              onDismiss={() => setDropdownVisible(null)}
              anchor={<IconButton icon="chevron-down" onPress={() => setDropdownVisible('result')} />}
            >
              {([...matchOptions.results, 'Won', 'Lost', 'Draw', 'Tie', 'No Result'].filter((v, i, a) => a.indexOf(v) === i)).map((r) => (
                <Menu.Item key={r} onPress={() => { setNewMatch({ ...newMatch, result: r }); setDropdownVisible(null); }} title={r} />
              ))}
            </Menu>
          </View>
          <TextInput
            label="Team total (runs)"
            value={newMatch.team_runs != null ? String(newMatch.team_runs) : ''}
            onChangeText={(text) => setNewMatch({
              ...newMatch,
              team_runs: text.trim() ? parseInt(text.replace(/\D/g, ''), 10) : undefined
            })}
            keyboardType="number-pad"
            placeholder="Optional — for % of team runs"
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
          <Text style={styles.subSectionTitle}>Bowling Extras</Text>
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

          <Text style={styles.sectionTitle}>Notes</Text>
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
          <TextInput
            label="Other Notes (Fielding, Captaincy)"
            value={newMatch.other_notes}
            onChangeText={(text) => setNewMatch({ ...newMatch, other_notes: text })}
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
            other_notes: '',
            competition: '',
            team_runs: undefined
          });
        }}>Cancel</Button>
          <Button onPress={handleAddMatch}>{editingMatch ? 'Save' : 'Add'}</Button>
        </Dialog.Actions>
      </KeyboardAvoidingView>
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
      
      <View style={styles.filtersPanel}>
        <Searchbar
          placeholder="Search matches..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.filterSearchBar}
        />
        <View style={styles.filtersRow}>
          <View style={styles.filterBlock}>
            <Text style={styles.filterLabel}>Min runs</Text>
            <View style={styles.filterInputRow}>
              <TextInput
                mode="outlined"
                placeholder="All"
                value={minRunsFilter}
                onChangeText={(text) => setMinRunsFilter(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                style={styles.filterInput}
                dense
              />
              {minRunsFilter.trim() !== '' && (
                <IconButton icon="close-circle" size={18} onPress={() => setMinRunsFilter('')} style={styles.filterClear} />
              )}
            </View>
          </View>
          <View style={styles.filterBlock}>
            <Text style={styles.filterLabel}>Min wickets</Text>
            <View style={styles.filterInputRow}>
              <TextInput
                mode="outlined"
                placeholder="All"
                value={minWicketsFilter}
                onChangeText={(text) => setMinWicketsFilter(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                style={styles.filterInput}
                dense
              />
              {minWicketsFilter.trim() !== '' && (
                <IconButton icon="close-circle" size={18} onPress={() => setMinWicketsFilter('')} style={styles.filterClear} />
              )}
            </View>
          </View>
          <View style={styles.filterBlock}>
            <Text style={styles.filterLabel}>Sort by</Text>
            <View style={styles.filterButtonRow}>
              <Button
                mode={sortBy === 'date' ? 'contained' : 'outlined'}
                onPress={() => setSortBy('date')}
                compact
                style={styles.filterSortBtn}
              >
                Date
              </Button>
              <Button
                mode={sortBy === 'fantasy' ? 'contained' : 'outlined'}
                onPress={() => setSortBy('fantasy')}
                compact
                style={styles.filterSortBtn}
              >
                Contribution
              </Button>
            </View>
          </View>
        </View>
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
            {filteredMatches.map(renderMatchListItem)}
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
  matchListFantasy: {
    fontSize: 11,
    color: '#2E7D32',
    marginTop: 2,
    fontWeight: '600',
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
  fantasySection: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  fantasyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  fantasyTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  fantasyBreakdown: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  fantasyBreakdownText: {
    fontSize: 12,
    color: '#388E3C',
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
  filtersPanel: {
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  filterSearchBar: {
    marginBottom: 12,
    backgroundColor: '#fff',
    elevation: 0,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 16,
  },
  filterBlock: {
    minWidth: 90,
  },
  filterLabel: {
    fontSize: 12,
    color: '#49454F',
    marginBottom: 6,
    fontWeight: '500',
  },
  filterInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterInput: {
    width: 72,
    backgroundColor: '#fff',
  },
  filterClear: {
    margin: 0,
    marginLeft: -4,
  },
  filterButtonRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterSortBtn: {
    minWidth: 0,
  },
  dropdownInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dropdownTextInput: {
    flex: 1,
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
  dialogKeyboardView: {
    maxHeight: '100%',
  },
  dialogScrollArea: {
    maxHeight: 400,
  },
  dialogContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
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
  opponentNameBold: {
    fontWeight: 'bold',
    color: '#333',
  },
}); 