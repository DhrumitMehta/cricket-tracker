import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, StatusBar } from 'react-native';
import { Text, Card, Button, Menu, Divider } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Stats'>;

interface CumulativeStats {
  batting: {
    matches: number;
    innings: number;
    runs: number;
    balls: number;
    average: number;
    strikeRate: number;
    highest: number;
    notOuts: number;
    fours: number;
    sixes: number;
    dots: number;
    dotPercentage: number;
    boundaryPercentage: number;
    ballsPerBoundary: number;
    fifties: number;
    hundreds: number;
    avgPosition: number;
  };
  bowling: {
    matches: number;
    innings: number;
    balls: number;
    overs: number;
    maidens: number;
    runs: number;
    wickets: number;
    average: number;
    economy: number;
    strikeRate: number;
    bestFigures: string;
    dots: number;
    fours: number;
    sixes: number;
    wides: number;
    noBalls: number;
    dotPercentage: number;
    ballsPerBoundary: number;
    ballsPerWide: number;
    ballsPerNoBall: number;
    boundaryPercentage: number;
  };
  fielding: {
    matches: number;
    infieldCatches: number;
    boundaryCatches: number;
    directRunouts: number;
    indirectRunouts: number;
    drops: number;
    playerOfMatch: number;
    contributionsPerMatch: number;
    dropsPerMatch: number;
  };
}

interface FilterState {
  format: 'All' | 'T20' | 'ODI' | 'T10' | 'Other';
  year: 'All' | string;
  venue: 'All' | string;
  opposition: 'All' | string;
  result: 'All' | 'Won' | 'Lost' | 'Draw' | 'Tie';
}

const Stats = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CumulativeStats>({
    batting: {
      matches: 0,
      innings: 0,
      runs: 0,
      balls: 0,
      average: 0,
      strikeRate: 0,
      highest: 0,
      notOuts: 0,
      fours: 0,
      sixes: 0,
      dots: 0,
      dotPercentage: 0,
      boundaryPercentage: 0,
      ballsPerBoundary: 0,
      fifties: 0,
      hundreds: 0,
      avgPosition: 0,
    },
    bowling: {
      matches: 0,
      innings: 0,
      balls: 0,
      overs: 0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      average: 0,
      economy: 0,
      strikeRate: 0,
      bestFigures: '0/0',
      dots: 0,
      fours: 0,
      sixes: 0,
      wides: 0,
      noBalls: 0,
      dotPercentage: 0,
      ballsPerBoundary: 0,
      ballsPerWide: 0,
      ballsPerNoBall: 0,
      boundaryPercentage: 0,
    },
    fielding: {
      matches: 0,
      infieldCatches: 0,
      boundaryCatches: 0,
      directRunouts: 0,
      indirectRunouts: 0,
      drops: 0,
      playerOfMatch: 0,
      contributionsPerMatch: 0,
      dropsPerMatch: 0,
    },
  });

  const [filters, setFilters] = useState<FilterState>({
    format: 'All',
    year: 'All',
    venue: 'All',
    opposition: 'All',
    result: 'All'
  });

  const [formatMenuVisible, setFormatMenuVisible] = useState(false);
  const [yearMenuVisible, setYearMenuVisible] = useState(false);
  const [venueMenuVisible, setVenueMenuVisible] = useState(false);
  const [oppositionMenuVisible, setOppositionMenuVisible] = useState(false);
  const [resultMenuVisible, setResultMenuVisible] = useState(false);

  const [uniqueYears, setUniqueYears] = useState<string[]>([]);
  const [uniqueVenues, setUniqueVenues] = useState<string[]>([]);
  const [uniqueOppositions, setUniqueOppositions] = useState<string[]>([]);

  useEffect(() => {
    fetchStats();
  }, [filters]);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: matches, error } = await supabase
        .from('matches')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching matches:', error);
        return;
      }

      if (!matches) return;

      // Extract unique values for filters
      const years = [...new Set(matches.map(m => new Date(m.date).getFullYear().toString()))];
      const venues = [...new Set(matches.map(m => m.venue))];
      const oppositions = [...new Set(matches.map(m => m.opponent))];

      setUniqueYears(years);
      setUniqueVenues(venues);
      setUniqueOppositions(oppositions);

      // Apply filters
      let filteredMatches = matches;
      
      if (filters.format !== 'All') {
        filteredMatches = filteredMatches.filter(m => m.match_format === filters.format);
      }
      
      if (filters.year !== 'All') {
        filteredMatches = filteredMatches.filter(m => 
          new Date(m.date).getFullYear().toString() === filters.year
        );
      }
      
      if (filters.venue !== 'All') {
        filteredMatches = filteredMatches.filter(m => m.venue === filters.venue);
      }
      
      if (filters.opposition !== 'All') {
        filteredMatches = filteredMatches.filter(m => m.opponent === filters.opposition);
      }
      
      if (filters.result !== 'All') {
        filteredMatches = filteredMatches.filter(m => {
          const result = m.result.toLowerCase();
          if (filters.result === 'Won') return result.includes('won');
          if (filters.result === 'Lost') return result.includes('lost');
          if (filters.result === 'Draw') return result.includes('draw');
          if (filters.result === 'Tie') return result.includes('tie');
          return true;
        });
      }

      // Debug logging for 50s and 100s
      const fiftyPlusScores = filteredMatches
        .filter(m => m.batting.runs >= 50)
        .map(m => ({
          runs: m.batting.runs,
          date: m.date,
          opponent: m.opponent
        }))
        .sort((a, b) => b.runs - a.runs);

      console.log('Scores of 50 or more:', fiftyPlusScores);

      // Calculate cumulative stats
      const newStats: CumulativeStats = {
        batting: {
          matches: filteredMatches.length,
          innings: filteredMatches.filter(m => m.batting.balls > 0).length,
          runs: filteredMatches.reduce((sum, m) => sum + m.batting.runs, 0),
          balls: filteredMatches.reduce((sum, m) => sum + m.batting.balls, 0),
          average: 0,
          strikeRate: 0,
          highest: Math.max(...filteredMatches.map(m => m.batting.runs)),
          notOuts: filteredMatches.filter(m => m.batting.not_out).length,
          fours: filteredMatches.reduce((sum, m) => sum + m.batting.fours, 0),
          sixes: filteredMatches.reduce((sum, m) => sum + m.batting.sixes, 0),
          dots: filteredMatches.reduce((sum, m) => sum + m.batting.dots, 0),
          dotPercentage: 0,
          boundaryPercentage: 0,
          ballsPerBoundary: 0,
          fifties: filteredMatches.filter(m => m.batting.runs >= 50 && m.batting.runs < 100).length,
          hundreds: filteredMatches.filter(m => m.batting.runs >= 100).length,
          avgPosition: filteredMatches.reduce((sum, m) => sum + (m.batting?.position || 0), 0) / 
                      filteredMatches.filter(m => m.batting?.position > 0).length || 0,
        },
        bowling: {
          matches: filteredMatches.length,
          innings: filteredMatches.filter(m => m.bowling.balls > 0).length,
          balls: filteredMatches.reduce((sum, m) => sum + m.bowling.balls, 0),
          overs: Math.floor(filteredMatches.reduce((sum, m) => sum + m.bowling.balls, 0) / 6),
          maidens: filteredMatches.reduce((sum, m) => sum + m.bowling.maidens, 0),
          runs: filteredMatches.reduce((sum, m) => sum + m.bowling.runs, 0),
          wickets: filteredMatches.reduce((sum, m) => sum + m.bowling.wickets, 0),
          average: 0,
          economy: 0,
          strikeRate: 0,
          bestFigures: '0/0',
          dots: filteredMatches.reduce((sum, m) => sum + m.bowling.dots, 0),
          fours: filteredMatches.reduce((sum, m) => sum + m.bowling.fours, 0),
          sixes: filteredMatches.reduce((sum, m) => sum + m.bowling.sixes, 0),
          wides: filteredMatches.reduce((sum, m) => sum + (m.bowling_wides || 0), 0),
          noBalls: filteredMatches.reduce((sum, m) => sum + (m.bowling_noballs || 0), 0),
          dotPercentage: 0,
          ballsPerBoundary: 0,
          ballsPerWide: 0,
          ballsPerNoBall: 0,
          boundaryPercentage: 0,
        },
        fielding: {
          matches: filteredMatches.length,
          infieldCatches: filteredMatches.reduce((sum, m) => sum + m.fielding.infield_catches, 0),
          boundaryCatches: filteredMatches.reduce((sum, m) => sum + m.fielding.boundary_catches, 0),
          directRunouts: filteredMatches.reduce((sum, m) => sum + m.fielding.direct_runouts, 0),
          indirectRunouts: filteredMatches.reduce((sum, m) => sum + m.fielding.indirect_runouts, 0),
          drops: filteredMatches.reduce((sum, m) => sum + m.fielding.drops, 0),
          playerOfMatch: filteredMatches.filter(m => m.fielding.player_of_match).length,
          contributionsPerMatch: 0,
          dropsPerMatch: 0,
        },
      };

      // Calculate derived stats
      const battingInnings = newStats.batting.innings;
      const battingDismissals = battingInnings - newStats.batting.notOuts;
      newStats.batting.average = battingDismissals > 0 ? newStats.batting.runs / battingDismissals : 0;
      newStats.batting.strikeRate = newStats.batting.balls > 0 ? (newStats.batting.runs / newStats.batting.balls) * 100 : 0;
      newStats.batting.dotPercentage = newStats.batting.balls > 0 ? (newStats.batting.dots / newStats.batting.balls) * 100 : 0;
      newStats.batting.boundaryPercentage = newStats.batting.runs > 0 ? 
        ((newStats.batting.fours * 4 + newStats.batting.sixes * 6) / newStats.batting.runs) * 100 : 0;
      newStats.batting.ballsPerBoundary = (newStats.batting.fours + newStats.batting.sixes) > 0 ? 
        newStats.batting.balls / (newStats.batting.fours + newStats.batting.sixes) : 0;

      const bowlingInnings = newStats.bowling.innings;
      newStats.bowling.average = newStats.bowling.wickets > 0 ? newStats.bowling.runs / newStats.bowling.wickets : 0;
      newStats.bowling.economy = newStats.bowling.balls > 0 ? (newStats.bowling.runs / newStats.bowling.balls) * 6 : 0;
      newStats.bowling.strikeRate = newStats.bowling.wickets > 0 ? newStats.bowling.balls / newStats.bowling.wickets : 0;
      newStats.bowling.dotPercentage = newStats.bowling.balls > 0 ? (newStats.bowling.dots / newStats.bowling.balls) * 100 : 0;
      newStats.bowling.ballsPerBoundary = (newStats.bowling.fours + newStats.bowling.sixes) > 0 ? 
        newStats.bowling.balls / (newStats.bowling.fours + newStats.bowling.sixes) : 0;

      // Calculate best bowling figures
      const bestBowling = filteredMatches
        .filter(m => m.bowling.wickets > 0)
        .sort((a, b) => {
          if (a.bowling.wickets !== b.bowling.wickets) {
            return b.bowling.wickets - a.bowling.wickets;
          }
          return a.bowling.runs - b.bowling.runs;
        })[0];

      if (bestBowling) {
        newStats.bowling.bestFigures = `${bestBowling.bowling.wickets}/${bestBowling.bowling.runs}`;
      }

      const totalBalls = newStats.bowling.balls;
      const totalWides = newStats.bowling.wides;
      const totalNoBalls = newStats.bowling.noBalls;
      const totalRuns = newStats.bowling.runs;
      const totalBoundaryRuns = (newStats.bowling.fours * 4) + (newStats.bowling.sixes * 6);

      // Calculate balls per wide
      newStats.bowling.ballsPerWide = totalWides > 0 ? totalBalls / totalWides : 0;

      // Calculate balls per no-ball
      newStats.bowling.ballsPerNoBall = totalNoBalls > 0 ? totalBalls / totalNoBalls : 0;

      // Calculate boundary percentage
      newStats.bowling.boundaryPercentage = totalRuns > 0 ? 
        (totalBoundaryRuns / totalRuns) * 100 : 0;

      // Calculate fielding contributions per match
      const totalContributions = newStats.fielding.infieldCatches + 
                               newStats.fielding.boundaryCatches + 
                               newStats.fielding.directRunouts + 
                               newStats.fielding.indirectRunouts;
      
      newStats.fielding.contributionsPerMatch = newStats.fielding.matches > 0 ? 
        totalContributions / newStats.fielding.matches : 0;

      // Calculate drops per match
      newStats.fielding.dropsPerMatch = newStats.fielding.matches > 0 ? 
        newStats.fielding.drops / newStats.fielding.matches : 0;

      console.log('Fielding stats:', newStats.fielding);

      setStats(newStats);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          {/* Filter Section */}
          <Card style={styles.filterCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Filters</Text>
              <View style={styles.filterGrid}>
                {/* Format Filter */}
                <Menu
                  visible={formatMenuVisible}
                  onDismiss={() => setFormatMenuVisible(false)}
                  anchor={
                    <Button 
                      mode="outlined" 
                      onPress={() => setFormatMenuVisible(true)}
                      style={styles.filterButton}
                    >
                      Format: {filters.format}
                    </Button>
                  }
                >
                  <Menu.Item onPress={() => { setFilters({...filters, format: 'All'}); setFormatMenuVisible(false); }} title="All" />
                  <Menu.Item onPress={() => { setFilters({...filters, format: 'T20'}); setFormatMenuVisible(false); }} title="T20" />
                  <Menu.Item onPress={() => { setFilters({...filters, format: 'ODI'}); setFormatMenuVisible(false); }} title="ODI" />
                  <Menu.Item onPress={() => { setFilters({...filters, format: 'T10'}); setFormatMenuVisible(false); }} title="T10" />
                  <Menu.Item onPress={() => { setFilters({...filters, format: 'Other'}); setFormatMenuVisible(false); }} title="Other" />
                </Menu>

                {/* Year Filter */}
                <Menu
                  visible={yearMenuVisible}
                  onDismiss={() => setYearMenuVisible(false)}
                  anchor={
                    <Button 
                      mode="outlined" 
                      onPress={() => setYearMenuVisible(true)}
                      style={styles.filterButton}
                    >
                      Year: {filters.year}
                    </Button>
                  }
                >
                  <Menu.Item onPress={() => { setFilters({...filters, year: 'All'}); setYearMenuVisible(false); }} title="All" />
                  {uniqueYears.map(year => (
                    <Menu.Item 
                      key={year}
                      onPress={() => { setFilters({...filters, year}); setYearMenuVisible(false); }} 
                      title={year}
                    />
                  ))}
                </Menu>

                {/* Venue Filter */}
                <Menu
                  visible={venueMenuVisible}
                  onDismiss={() => setVenueMenuVisible(false)}
                  anchor={
                    <Button 
                      mode="outlined" 
                      onPress={() => setVenueMenuVisible(true)}
                      style={styles.filterButton}
                    >
                      Venue: {filters.venue}
                    </Button>
                  }
                >
                  <Menu.Item onPress={() => { setFilters({...filters, venue: 'All'}); setVenueMenuVisible(false); }} title="All" />
                  {uniqueVenues.map(venue => (
                    <Menu.Item 
                      key={venue}
                      onPress={() => { setFilters({...filters, venue}); setVenueMenuVisible(false); }} 
                      title={venue}
                    />
                  ))}
                </Menu>

                {/* Opposition Filter */}
                <Menu
                  visible={oppositionMenuVisible}
                  onDismiss={() => setOppositionMenuVisible(false)}
                  anchor={
                    <Button 
                      mode="outlined" 
                      onPress={() => setOppositionMenuVisible(true)}
                      style={styles.filterButton}
                    >
                      Opposition: {filters.opposition}
                    </Button>
                  }
                >
                  <Menu.Item onPress={() => { setFilters({...filters, opposition: 'All'}); setOppositionMenuVisible(false); }} title="All" />
                  {uniqueOppositions.map(opposition => (
                    <Menu.Item 
                      key={opposition}
                      onPress={() => { setFilters({...filters, opposition}); setOppositionMenuVisible(false); }} 
                      title={opposition}
                    />
                  ))}
                </Menu>

                {/* Result Filter */}
                <Menu
                  visible={resultMenuVisible}
                  onDismiss={() => setResultMenuVisible(false)}
                  anchor={
                    <Button 
                      mode="outlined" 
                      onPress={() => setResultMenuVisible(true)}
                      style={styles.filterButton}
                    >
                      Result: {filters.result}
                    </Button>
                  }
                >
                  <Menu.Item onPress={() => { setFilters({...filters, result: 'All'}); setResultMenuVisible(false); }} title="All" />
                  <Menu.Item onPress={() => { setFilters({...filters, result: 'Won'}); setResultMenuVisible(false); }} title="Won" />
                  <Menu.Item onPress={() => { setFilters({...filters, result: 'Lost'}); setResultMenuVisible(false); }} title="Lost" />
                  <Menu.Item onPress={() => { setFilters({...filters, result: 'Draw'}); setResultMenuVisible(false); }} title="Draw" />
                  <Menu.Item onPress={() => { setFilters({...filters, result: 'Tie'}); setResultMenuVisible(false); }} title="Tie" />
                </Menu>
              </View>
            </Card.Content>
          </Card>

          {/* Batting Stats */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Batting Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Matches</Text>
                  <Text style={styles.statValue}>{stats.batting.matches}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Innings</Text>
                  <Text style={styles.statValue}>{stats.batting.innings}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Runs</Text>
                  <Text style={styles.statValue}>{stats.batting.runs}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Average</Text>
                  <Text style={styles.statValue}>{stats.batting.average.toFixed(2)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Strike Rate</Text>
                  <Text style={styles.statValue}>{stats.batting.strikeRate.toFixed(2)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Highest</Text>
                  <Text style={styles.statValue}>{stats.batting.highest}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Not Outs</Text>
                  <Text style={styles.statValue}>{stats.batting.notOuts}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>4s</Text>
                  <Text style={styles.statValue}>{stats.batting.fours}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>6s</Text>
                  <Text style={styles.statValue}>{stats.batting.sixes}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Dot %</Text>
                  <Text style={styles.statValue}>{stats.batting.dotPercentage.toFixed(1)}%</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Bdry Run %</Text>
                  <Text style={styles.statValue}>{stats.batting.boundaryPercentage.toFixed(1)}%</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Balls/Bdry</Text>
                  <Text style={styles.statValue}>{stats.batting.ballsPerBoundary.toFixed(1)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>50s</Text>
                  <Text style={styles.statValue}>{stats.batting.fifties}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>100s</Text>
                  <Text style={styles.statValue}>{stats.batting.hundreds}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Avg Position</Text>
                  <Text style={styles.statValue}>{stats.batting.avgPosition.toFixed(1)}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Bowling Stats */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Bowling Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Matches</Text>
                  <Text style={styles.statValue}>{stats.bowling.matches}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Innings</Text>
                  <Text style={styles.statValue}>{stats.bowling.innings}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Overs</Text>
                  <Text style={styles.statValue}>{stats.bowling.overs}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Maidens</Text>
                  <Text style={styles.statValue}>{stats.bowling.maidens}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Runs</Text>
                  <Text style={styles.statValue}>{stats.bowling.runs}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Wickets</Text>
                  <Text style={styles.statValue}>{stats.bowling.wickets}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Average</Text>
                  <Text style={styles.statValue}>{stats.bowling.average.toFixed(2)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Economy</Text>
                  <Text style={styles.statValue}>{stats.bowling.economy.toFixed(2)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Strike Rate</Text>
                  <Text style={styles.statValue}>{stats.bowling.strikeRate.toFixed(2)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Best Figures</Text>
                  <Text style={styles.statValue}>{stats.bowling.bestFigures}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Dot %</Text>
                  <Text style={styles.statValue}>{stats.bowling.dotPercentage.toFixed(1)}%</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Bdry Run %</Text>
                  <Text style={styles.statValue}>{stats.bowling.boundaryPercentage.toFixed(1)}%</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Balls/Bdry</Text>
                  <Text style={styles.statValue}>{stats.bowling.ballsPerBoundary.toFixed(1)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Balls/Wide</Text>
                  <Text style={styles.statValue}>{stats.bowling.ballsPerWide.toFixed(1)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Balls/No Ball</Text>
                  <Text style={styles.statValue}>{stats.bowling.ballsPerNoBall.toFixed(1)}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Fielding Stats */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Fielding Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Matches</Text>
                  <Text style={styles.statValue}>{stats.fielding.matches}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Infield Catches</Text>
                  <Text style={styles.statValue}>{stats.fielding.infieldCatches}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Boundary Catches</Text>
                  <Text style={styles.statValue}>{stats.fielding.boundaryCatches}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Direct Run Outs</Text>
                  <Text style={styles.statValue}>{stats.fielding.directRunouts}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Indirect Run Outs</Text>
                  <Text style={styles.statValue}>{stats.fielding.indirectRunouts}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Drops</Text>
                  <Text style={styles.statValue}>{stats.fielding.drops}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Player of Match</Text>
                  <Text style={styles.statValue}>{stats.fielding.playerOfMatch}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Contributions/Match</Text>
                  <Text style={styles.statValue}>{stats.fielding.contributionsPerMatch.toFixed(1)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Drops/Match</Text>
                  <Text style={styles.statValue}>{stats.fielding.dropsPerMatch.toFixed(1)}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  statItem: {
    width: '30%',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  filterCard: {
    marginBottom: 16,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  filterButton: {
    flex: 1,
    minWidth: '45%',
  },
});

export default Stats; 