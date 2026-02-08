import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
  Keyboard,
  ScrollView,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User } from '../types';
import { searchService, SearchTag, userService, UpcomingTrailPost } from '../services/api';

type TabType = 'all' | 'accounts' | 'tags';

const CARD_WIDTH = 160;
const CARD_MARGIN = 8;

const SearchScreen: React.FC = () => {
  const { user: currentUser, facebookAccessToken } = useAuth();
  const { showToast } = useToast();
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [trendingTags, setTrendingTags] = useState<SearchTag[]>([]);
  const [upcomingTrailPosts, setUpcomingTrailPosts] = useState<UpcomingTrailPost[]>([]);
  const [userResults, setUserResults] = useState<User[]>([]);
  const [tagResults, setTagResults] = useState<SearchTag[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const loadSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const [users, tags, upcoming] = await Promise.all([
        searchService.getSuggestedUsers(),
        searchService.getTrendingTags(),
        searchService.getUpcomingTrailPosts(facebookAccessToken ?? undefined),
      ]);
      setSuggestedUsers(users);
      setTrendingTags(tags);
      setUpcomingTrailPosts(upcoming);
      setRecentSearches(await searchService.getRecentSearches());
    } catch (e) {
      console.error('Load suggestions error', e);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [facebookAccessToken]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    if (currentUser) {
      setFollowingIds(new Set(currentUser.following));
    }
  }, [currentUser?.following]);

  useEffect(() => {
    if (!query.trim()) {
      setUserResults([]);
      setTagResults([]);
      searchService.getRecentSearches().then(setRecentSearches);
      return;
    }
    const t = query.trim();
    let cancelled = false;
    setLoadingSearch(true);
    (async () => {
      try {
        const [users, tags] = await Promise.all([
          searchService.searchUsers(t),
          searchService.searchTags(t),
        ]);
        if (!cancelled) {
          setUserResults(users);
          setTagResults(tags);
        }
      } catch (e) {
        if (!cancelled) {
          setUserResults([]);
          setTagResults([]);
        }
      } finally {
        if (!cancelled) setLoadingSearch(false);
      }
    })();
    return () => { cancelled = true; };
  }, [query]);

  const handleClearQuery = () => {
    setQuery('');
    Keyboard.dismiss();
  };

  const handleSearchSubmit = async (term: string) => {
    const t = term.trim();
    if (t) {
      await searchService.addRecentSearch(t);
      setRecentSearches(await searchService.getRecentSearches());
    }
  };

  const handleRecentTap = (term: string) => {
    setQuery(term);
    handleSearchSubmit(term);
  };

  const handleClearRecent = async () => {
    await searchService.clearRecentSearches();
    setRecentSearches([]);
  };

  const handleFollow = async (userId: string) => {
    if (!currentUser) return;
    try {
      await userService.followUser(userId);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (next.has(userId)) next.delete(userId);
        else next.add(userId);
        return next;
      });
    } catch (e) {
      showToast('Could not update follow.', 'error');
    }
  };

  const handleTagTap = async (tag: string) => {
    const tagName = tag.replace(/^#/, '');
    await searchService.addRecentSearch(tag.startsWith('#') ? tag : `#${tagName}`);
    setRecentSearches(await searchService.getRecentSearches());
    setQuery('');
    navigation.navigate('FeedStack', {
      screen: 'FeedHome',
      params: { tag: tagName },
    });
  };

  const handleAccountPress = (item: User) => {
    if (currentUser?._id === item._id) return;
    navigation.navigate('FeedStack', {
      screen: 'UserProfile',
      params: {
        userId: item._id,
        username: item.username,
        avatar: item.avatar,
        bio: item.bio,
      },
    });
  };

  const handleUpcomingTrailPress = (item: UpcomingTrailPost) => {
    if (item.registerUrl) {
      Linking.openURL(item.registerUrl).catch(() => showToast('Could not open registration link.', 'error'));
      return;
    }
    if (item.postId) {
      navigation.navigate('FeedStack', {
        screen: 'Comments',
        params: {
          postId: item.postId,
          username: '',
          caption: item.title,
          image: item.image,
        },
      });
      return;
    }
    Alert.alert(item.title, 'Event details & registration coming soon.');
  };

  const isFollowing = (userId: string) => followingIds.has(userId);

  const showEmptyState = !query.trim();
  const showResults = query.trim() && (userResults.length > 0 || tagResults.length > 0);

  const renderAccountRow = ({ item }: { item: User }) => {
    const following = isFollowing(item._id);
    const isCurrentUser = currentUser?._id === item._id;
    return (
      <TouchableOpacity
        style={styles.accountRow}
        activeOpacity={0.7}
        onPress={() => handleAccountPress(item)}
      >
        <View style={styles.avatarWrap}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>
                {(item.username || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.username} numberOfLines={1}>{item.username}</Text>
          {item.bio ? (
            <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>
          ) : null}
        </View>
        {!isCurrentUser && (
          <TouchableOpacity
            style={[styles.followBtn, following && styles.followBtnFollowing]}
            onPress={() => handleFollow(item._id)}
          >
            <Text style={[styles.followBtnText, following && styles.followBtnTextFollowing]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderTagRow = ({ item }: { item: SearchTag }) => (
    <TouchableOpacity
      style={styles.tagRow}
      activeOpacity={0.7}
      onPress={() => handleTagTap(item.tag)}
    >
      <Ionicons name="pricetag-outline" size={20} color="#666" />
      <View style={styles.tagInfo}>
        <Text style={styles.tagName}>#{item.tag}</Text>
        <Text style={styles.tagCount}>{item.postCount} posts</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchBarWrap}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => handleSearchSubmit(query)}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClearQuery} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs - show when there is a query */}
      {query.trim().length > 0 && (
        <View style={styles.tabs}>
          {(['all', 'accounts', 'tags'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'all' ? 'All' : tab === 'accounts' ? 'Accounts' : 'Tags'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loadingSearch && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#333" />
        </View>
      )}

      {showEmptyState && !loadingSuggestions && (
        <FlatList
          data={['footer']}
          ListHeaderComponent={
            <>
              {upcomingTrailPosts.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Highlight</Text>
                  <Text style={styles.highlightSubtitle}>Trail run events – discover & register</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.upcomingScrollContent}
                  >
                    {upcomingTrailPosts.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.upcomingCard, { width: CARD_WIDTH }]}
                        activeOpacity={0.8}
                        onPress={() => handleUpcomingTrailPress(item)}
                      >
                        <Image source={{ uri: item.image }} style={styles.upcomingCardImage} />
                        <View style={styles.upcomingCardOverlay} />
                        <View style={styles.upcomingCardContent}>
                          {item.registerUrl ? (
                            <View style={styles.upcomingCardRegisterBadge}>
                              <Text style={styles.upcomingCardRegisterText}>Register</Text>
                            </View>
                          ) : null}
                          <Text style={styles.upcomingCardTitle} numberOfLines={2}>{item.title}</Text>
                          <Text style={styles.upcomingCardTrail} numberOfLines={1}>
                            {item.location || item.trailName}
                          </Text>
                          <Text style={styles.upcomingCardDate}>{item.date}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {recentSearches.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>Recent</Text>
                    <TouchableOpacity onPress={handleClearRecent}>
                      <Text style={styles.sectionAction}>Clear all</Text>
                    </TouchableOpacity>
                  </View>
                  {recentSearches.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={styles.recentItem}
                      onPress={() => handleRecentTap(s)}
                    >
                      <Ionicons name="time-outline" size={20} color="#666" />
                      <Text style={styles.recentText} numberOfLines={1}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Suggested</Text>
                {suggestedUsers.map((u) => (
                  <View key={u._id}>{renderAccountRow({ item: u })}</View>
                ))}
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trending</Text>
                <View style={styles.trendingRow}>
                  {trendingTags.map((t) => (
                    <TouchableOpacity
                      key={t.tag}
                      style={styles.trendingChip}
                      onPress={() => handleTagTap(t.tag)}
                    >
                      <Text style={styles.trendingChipText}>#{t.tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          }
          renderItem={() => null}
          keyExtractor={() => 'footer'}
        />
      )}

      {showEmptyState && loadingSuggestions && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#333" />
        </View>
      )}

      {query.trim().length > 0 && !loadingSearch && (
        <>
          {(userResults.length > 0 || tagResults.length > 0) ? (
            <FlatList
              data={[]}
              ListHeaderComponent={
                <>
                  {activeTab !== 'tags' && userResults.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Accounts</Text>
                      {userResults.map((u) => (
                        <View key={u._id}>{renderAccountRow({ item: u })}</View>
                      ))}
                    </View>
                  )}
                  {activeTab !== 'accounts' && tagResults.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Tags</Text>
                      {tagResults.map((t) => (
                        <View key={t.tag}>{renderTagRow({ item: t })}</View>
                      ))}
                    </View>
                  )}
                </>
              }
              renderItem={() => null}
              keyExtractor={() => 'list'}
            />
          ) : (
            <View style={styles.emptyResults}>
              <Ionicons name="search-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No results for "{query}"</Text>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#efefef',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  loadingWrap: {
    padding: 24,
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  highlightSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  upcomingScrollContent: {
    paddingRight: 16,
    gap: CARD_MARGIN,
  },
  upcomingCard: {
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: CARD_MARGIN,
  },
  upcomingCardImage: {
    width: '100%',
    height: '100%',
  },
  upcomingCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  upcomingCardContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
  },
  upcomingCardRegisterBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0095F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  upcomingCardRegisterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  upcomingCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  upcomingCardTrail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 2,
  },
  upcomingCardDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  sectionAction: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  recentText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  bio: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0095f6',
  },
  followBtnFollowing: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  followBtnTextFollowing: {
    color: '#000',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  tagInfo: {
    flex: 1,
  },
  tagName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  tagCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  trendingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trendingChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#efefef',
    borderRadius: 8,
  },
  trendingChipText: {
    fontSize: 14,
    color: '#0095f6',
    fontWeight: '500',
  },
  emptyResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default SearchScreen;
