import { useAuth } from '../contexts/AuthContext';
import { indianStates } from '../lib/statesData';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import Header from '../components/Header';
import EventCard from '../components/EventCard';
import FAB from '../components/FAB';
import LocationPicker from '../components/LocationPicker';

export default function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [allFetchedEvents, setAllFetchedEvents] = useState(() => {
        try {
            const cached = localStorage.getItem('cachedEvents');
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(!allFetchedEvents || allFetchedEvents.length === 0);
    const [selectedState, setSelectedState] = useState('All Regions');
    const [selectedCity, setSelectedCity] = useState('All Cities');
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [locationHierarchy, setLocationHierarchy] = useState({ 'All Regions': ['All Cities'] });
    const [statesWithEvents, setStatesWithEvents] = useState(new Set());
    const [citiesWithEvents, setCitiesWithEvents] = useState(new Set());

    const cityToStateMap = {
        'Mumbai': 'Maharashtra', 'Pune': 'Maharashtra', 'Nagpur': 'Maharashtra', 'Nashik': 'Maharashtra',
        'Bangalore': 'Karnataka', 'Bengaluru': 'Karnataka', 'Mangalore': 'Karnataka',
        'Delhi': 'Delhi NCR', 'New Delhi': 'Delhi NCR', 'Noida': 'Delhi NCR', 'Gurgaon': 'Delhi NCR', 'Gurugram': 'Delhi NCR',
        'Hyderabad': 'Telangana',
        'Goa': 'Goa', 'North Goa': 'Goa', 'South Goa': 'Goa',
        'Chennai': 'Tamil Nadu',
        'Kolkata': 'West Bengal',
        'Ahmedabad': 'Gujarat', 'Surat': 'Gujarat',
        'Jaipur': 'Rajasthan', 'Udaipur': 'Rajasthan'
    };

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const q = query(
                    collection(db, "lists"),
                    orderBy("date", "asc"),
                    limit(200)
                );

                const querySnapshot = await getDocs(q);
                const eventsList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setAllFetchedEvents(eventsList);
                localStorage.setItem('cachedEvents', JSON.stringify(eventsList));

                const hierarchy = { 'All Regions': ['All Cities'] };
                const activeStates = new Set();
                const activeCities = new Set();

                eventsList.forEach(e => {
                    const city = e.city?.trim();
                    if (city) activeCities.add(city.toLowerCase());
                    const state = e.state?.trim() || cityToStateMap[city] || 'Other';
                    if (state) activeStates.add(state.toLowerCase());
                });

                setStatesWithEvents(activeStates);
                setCitiesWithEvents(activeCities);

                indianStates.forEach(item => {
                    hierarchy[item.state] = ['All Cities', ...item.cities];
                });

                if (!hierarchy['Other']) hierarchy['Other'] = ['All Cities', 'Other'];

                const sortedHierarchy = {};
                Object.keys(hierarchy).sort((a, b) => {
                    if (a === 'All Regions') return -1;
                    if (b === 'All Regions') return 1;
                    const aHas = statesWithEvents.has(a.toLowerCase());
                    const bHas = statesWithEvents.has(b.toLowerCase());
                    if (aHas && !bHas) return -1;
                    if (!aHas && bHas) return 1;
                    return a.localeCompare(b);
                }).forEach(state => {
                    sortedHierarchy[state] = hierarchy[state].sort((a, b) => {
                        if (a === 'All Cities') return -1;
                        if (b === 'All Cities') return 1;
                        const aHas = citiesWithEvents.has(a.toLowerCase());
                        const bHas = citiesWithEvents.has(b.toLowerCase());
                        if (aHas && !bHas) return -1;
                        if (!aHas && bHas) return 1;
                        return a.localeCompare(b);
                    });
                });

                setLocationHierarchy(sortedHierarchy);
                filterAndSetEvents(eventsList, selectedState, selectedCity);

            } catch (err) {
                console.error("Error fetching events:", err);
                const snap = await getDocs(query(collection(db, "lists"), limit(100)));
                const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllFetchedEvents(all);
                filterAndSetEvents(all, selectedState, selectedCity);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    useEffect(() => {
        filterAndSetEvents(allFetchedEvents, selectedState, selectedCity);
        localStorage.setItem('preferredState', selectedState);
        localStorage.setItem('preferredCity', selectedCity);
    }, [selectedState, selectedCity, allFetchedEvents]);

    const filterAndSetEvents = (all, state, city) => {
        if (!all || all.length === 0) return;

        let filtered = all;

        if (state !== 'All Regions') {
            filtered = filtered.filter(e => {
                const eState = e.state?.trim() || cityToStateMap[e.city?.trim()] || 'Other';
                return eState === state;
            });
        }

        if (city !== 'All Cities') {
            filtered = filtered.filter(e => e.city?.trim().toLowerCase() === city.toLowerCase());
        }

        setEvents(filtered);
    };

    const getEventStatus = (event) => {
        if (!event.closeTime || !event.date) return null;

        const now = new Date();
        const eventDate = new Date(event.date);
        const [hours, minutes] = event.closeTime.split(':');
        const closeDateTime = new Date(eventDate);
        closeDateTime.setHours(parseInt(hours), parseInt(minutes));

        const hoursUntilClose = (closeDateTime - now) / (1000 * 60 * 60);

        if (hoursUntilClose < 0) return { text: 'Closed', color: 'var(--text-muted)' };
        if (hoursUntilClose <= 1) return { text: `Closing soon (${event.closeTime})`, color: '#FF9500' };
        return { text: `Open till ${event.closeTime}`, color: 'var(--text-muted)' };
    };

    return (
        <section className="screen active">
            <Header
                center={
                    <div className="location-pill" onClick={() => setShowLocationPicker(true)}>
                        <span>{selectedCity === 'All Cities' ? selectedState : selectedCity}</span>
                        <i className="fas fa-chevron-down"></i>
                    </div>
                }
                right={
                    <div className="profile-icon-header" onClick={() => navigate('/profile')}>
                        <i className="fas fa-user-circle"></i>
                    </div>
                }
                title="Rocks Guestlist"
            />

            <div className="screen-content">
                <div className="greeting-card glass-card">
                    <h2>hey <span>{user?.displayName || user?.phoneNumber || 'User'}</span>,</h2>
                    <p>you can go for <span className="highlight-count">{events.length}</span> parties today for free in <span>{selectedCity === 'All Cities' ? selectedState : selectedCity}</span></p>
                </div>

                <div className="section-header" style={{ marginBottom: 16 }}>
                    <h3>Trending Guestlists</h3>
                </div>

                <div className="events-stack-list">
                    {loading ? (
                        <p style={{ textAlign: 'center', padding: 20 }}>Loading...</p>
                    ) : events.length === 0 ? (
                        <div className="empty-state">
                            <i className="fas fa-calendar-times"></i>
                            <p>No upcoming events found.</p>
                        </div>
                    ) : (
                        events.map(event => (
                            <EventCard
                                key={event.id}
                                event={event}
                                status={getEventStatus(event)}
                                onClick={() => navigate(`/event/${event.id}`)}
                            />
                        ))
                    )}
                </div>
            </div>

            <FAB onClick={() => navigate('/create')} />

            <LocationPicker
                show={showLocationPicker}
                onClose={() => setShowLocationPicker(false)}
                selectedState={selectedState}
                selectedCity={selectedCity}
                onStateSelect={setSelectedState}
                onCitySelect={setSelectedCity}
                locationHierarchy={locationHierarchy}
                statesWithEvents={statesWithEvents}
                citiesWithEvents={citiesWithEvents}
            />
        </section>
    );
}
