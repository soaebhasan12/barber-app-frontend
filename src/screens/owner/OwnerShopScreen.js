import React, { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { shopAPI, serviceAPI, staffAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';

const OwnerShopScreen = () => {
  const { logout } = useAuth();
  const [shop, setShop]         = useState(null);
  const [services, setServices] = useState([]);
  const [staff, setStaff]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('services');

  // New service form
  const [newService, setNewService] = useState({ name: '', price: '', durationMin: '' });
  const [addingService, setAddingService] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);

  // New staff form
  const [newStaff, setNewStaff] = useState({ name: '', phone: '' });
  const [addingStaff, setAddingStaff] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [editingServiceId, setEditingServiceId] = useState(null);
  
  const [shopInfo, setShopInfo] = useState({ name: '', phone: '', address: '', category: 'unisex' });
  const [savingShopInfo, setSavingShopInfo] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', phone: '', address: '', category: 'unisex' });

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const [regWorkingHours, setRegWorkingHours] = useState(
    DAYS.map((_, i) => ({ day: i, open: '09:00', close: '21:00', isClosed: false }))
  );

  const isValidTime = (t) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(t);
  
  const [regImages, setRegImages] = useState([]); // local URIs, pre-upload
  const [uploadingImages, setUploadingImages] = useState(false);

  const pickImages = async () => {
    if (regImages.length >= 5) return Alert.alert('Limit reached', 'You can add up to 5 photos');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission Required', 'Please allow photo access to add shop images.');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5 - regImages.length,
    });
    if (!result.canceled) {
      setRegImages([...regImages, ...result.assets.map(a => a.uri)]);
    }
  };

  const removeImage = (uri) => setRegImages(regImages.filter(u => u !== uri));

  const uploadImagesToCloudinary = async () => {
    const sigRes = await shopAPI.getUploadSignature();
    const { signature, timestamp, folder, cloudName, apiKey } = sigRes.data.data;

    const uploadedUrls = [];
    for (const uri of regImages) {
      const formData = new FormData();
      formData.append('file', { uri, type: 'image/jpeg', name: 'shop.jpg' });
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);

      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
        xhr.onload = () => {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(new Error('Invalid response from Cloudinary'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
      });
      if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');
      uploadedUrls.push(data.secure_url);
    }
    return uploadedUrls;
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await shopAPI.getMyShop();
      const shopData = res.data.data.shop;
      setShop(shopData);
      setServices(res.data.data.services);
      setStaff(res.data.data.staff);
      setShopInfo({
        name: shopData.name,
        phone: shopData.phone,
        address: shopData.address,
        category: shopData.category,
      });
    } catch (err) {
      if (err.response?.status !== 404) console.log('fetchData error:', err);
      // 404 = no shop yet, expected for a new owner — shop stays null, registration form shows
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async () => {
      if (!newService.name || !newService.price || !newService.durationMin) {
        return Alert.alert('Error', 'Please fill all fields');
      }
      setAddingService(true);
      try {
        if (editingServiceId) {
          await serviceAPI.update(editingServiceId, {
            name:        newService.name,
            price:       Number(newService.price),
            durationMin: Number(newService.durationMin),
          });
        } else {
          await serviceAPI.add({
            name:        newService.name,
            price:       Number(newService.price),
            durationMin: Number(newService.durationMin),
          });
        }
        setNewService({ name: '', price: '', durationMin: '' });
        setShowServiceForm(false);
        setEditingServiceId(null);
        fetchData();
      } catch (err) {
        console.log('handleAddService error:', err.message, err.response?.data);
        Alert.alert('Error', editingServiceId ? 'Failed to update service' : 'Failed to add service');
      } finally {
        setAddingService(false);
      }
    };

  const handleRemoveService = (id) => {
    Alert.alert('Remove Service', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await serviceAPI.remove(id);
          fetchData();
        } catch (err) {
          console.log('handleRemoveService error:', err.message, err.response?.data);
          Alert.alert('Error', 'Failed to remove service');
        }
      }},
    ]);
  };

  const handleEditService = (service) => {
      setNewService({
        name: service.name,
        price: String(service.price),
        durationMin: String(service.durationMin),
      });
      setEditingServiceId(service._id);
      setShowServiceForm(true);
  };

  const handleAddStaff = async () => {
    if (!newStaff.name) return Alert.alert('Error', 'Please enter staff name');
    setAddingStaff(true);
    try {
      if (editingStaffId) {
        await staffAPI.update(editingStaffId, { name: newStaff.name, phone: newStaff.phone });
      } else {
        await staffAPI.add({ name: newStaff.name, phone: newStaff.phone });
      }
      setNewStaff({ name: '', phone: '' });
      setShowStaffForm(false);
      setEditingStaffId(null);
      fetchData();
    } catch (err) {
      console.log('handleAddStaff error:', err.message, err.response?.data);
      Alert.alert('Error', editingStaffId ? 'Failed to update staff' : 'Failed to add staff');
    } finally {
      setAddingStaff(false);
    }
  };

  const handleRemoveStaff = (id) => {
    Alert.alert('Remove Staff', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await staffAPI.remove(id);
          fetchData();
        } catch (err) {
          console.log('handleRemoveStaff error:', err.message, err.response?.data);
          Alert.alert('Error', 'Failed to remove staff');
        }
      }},
    ]);
  };

  const handleEditStaff = (staffMember) => {
    setNewStaff({ name: staffMember.name, phone: staffMember.phone || '' });
    setEditingStaffId(staffMember._id);
    setShowStaffForm(true);
  };

  const toggleAccepting = async () => {
    try {
      await shopAPI.update({ acceptingBookings: !shop.acceptingBookings });
      fetchData();
    } catch (err) {
      console.log('toggleAccepting error:', err.message, err.response?.data);
      Alert.alert('Error', 'Failed to update shop');
    }
  };

  const handleRegisterShop = async () => {
    if (!regForm.name.trim() || !regForm.phone.trim() || !regForm.address.trim()) {
      return Alert.alert('Error', 'Please fill all fields');
    }

    let lat, lng;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return Alert.alert('Location Required', 'Please enable location access so customers can find your shop.');
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      lat = location.coords.latitude;
      lng = location.coords.longitude;
    } catch (err) {
      return Alert.alert('Error', 'Could not fetch your location. Please try again.');
    }

    setRegistering(true);
    try {
      for (const wh of regWorkingHours) {
        if (!wh.isClosed && (!isValidTime(wh.open) || !isValidTime(wh.close))) {
          setRegistering(false);
          return Alert.alert('Error', `Enter valid open/close time for ${DAYS[wh.day]} (HH:MM)`);
        }
      }
      
      let uploadedImages = [];
      if (regImages.length > 0) {
        setUploadingImages(true);
        try {
          uploadedImages = await uploadImagesToCloudinary();
        } catch (err) {
          console.log('image upload error:', err.message, err.response?.data);
          setRegistering(false);
          setUploadingImages(false);
          return Alert.alert('Error', 'Failed to upload shop images. Please try again.');
        }
        setUploadingImages(false);
      }
      await shopAPI.register({ ...regForm, lat, lng, workingHours: regWorkingHours, images: uploadedImages });
      Alert.alert('Success', 'Shop registered! It will be reviewed by our team shortly.');
      fetchData();
    } catch (err) {
      console.log('registerShop error:', err.message, err.response?.data);
      Alert.alert('Error', err.response?.data?.message || 'Failed to register shop');
    } finally {
      setRegistering(false);
    }
  };

  const handleSaveShopInfo = async () => {
    if (!shopInfo.name.trim() || !shopInfo.phone.trim() || !shopInfo.address.trim()) {
      return Alert.alert('Error', 'Please fill all fields');
    }
    setSavingShopInfo(true);
    try {
      await shopAPI.update(shopInfo);
      fetchData();
      Alert.alert('Success', 'Shop details updated');
    } catch (err) {
      console.log('handleSaveShopInfo error:', err.message, err.response?.data);
      Alert.alert('Error', 'Failed to update shop details');
    } finally {
      setSavingShopInfo(false);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={COLORS.accent} size="large" />
    </View>
  );

  if (!shop) return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: SPACING.lg, paddingTop: SPACING.xl + 20, paddingBottom: SPACING.xl + 40 }}>
      <Text style={styles.title}>Register Your Shop</Text>
      <View style={[styles.formCard, { marginTop: SPACING.lg }]}>
        <Input label="Shop Name" value={regForm.name} onChangeText={t => setRegForm({ ...regForm, name: t })} placeholder="e.g. Harun Barber Shop" />
        <Input label="Phone" value={regForm.phone} onChangeText={t => setRegForm({ ...regForm, phone: t })} placeholder="10-digit number" keyboardType="phone-pad" />
        <Input label="Address" value={regForm.address} onChangeText={t => setRegForm({ ...regForm, address: t })} placeholder="Shop address" />

        <Text style={[styles.itemMeta, { marginBottom: SPACING.xs, marginTop: SPACING.sm }]}>Shop Photos ({regImages.length}/5)</Text>
        <View style={styles.imageGrid}>
          {regImages.map((uri) => (
            <View key={uri} style={styles.imageThumbWrap}>
              <Image source={{ uri }} style={styles.imageThumb} />
              <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => removeImage(uri)}>
                <Ionicons name="close" size={12} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          ))}
          {regImages.length < 5 && (
            <TouchableOpacity style={styles.imageAddBtn} onPress={pickImages}>
              <Ionicons name="camera-outline" size={22} color={COLORS.accent} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.itemMeta, { marginBottom: SPACING.xs, marginTop: 4 }]}>Category</Text>
        <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg }}>
          {['men', 'women', 'unisex'].map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.tabBtn, { borderWidth: 1, borderColor: COLORS.border }, regForm.category === cat && styles.tabBtnActive]}
              onPress={() => setRegForm({ ...regForm, category: cat })}
            >
              <Text style={[styles.tabText, regForm.category === cat && styles.tabTextActive]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.itemMeta, { marginBottom: SPACING.xs, marginTop: SPACING.sm }]}>Working Hours</Text>
        {regWorkingHours.map((wh, i) => (
          <View key={wh.day} style={styles.whRow}>
            <Text style={styles.whDay}>{DAYS[wh.day]}</Text>
            {wh.isClosed ? (
              <Text style={styles.whClosedText}>Closed</Text>
            ) : (
              <>
                <Input
                  value={wh.open}
                  onChangeText={t => {
                    const updated = [...regWorkingHours];
                    updated[i].open = t;
                    setRegWorkingHours(updated);
                  }}
                  placeholder="09:00"
                  style={styles.whInput}
                />
                <Text style={styles.whDash}>-</Text>
                <Input
                  value={wh.close}
                  onChangeText={t => {
                    const updated = [...regWorkingHours];
                    updated[i].close = t;
                    setRegWorkingHours(updated);
                  }}
                  placeholder="21:00"
                  style={styles.whInput}
                />
              </>
            )}
            <TouchableOpacity onPress={() => {
              const updated = [...regWorkingHours];
              updated[i].isClosed = !updated[i].isClosed;
              setRegWorkingHours(updated);
            }}>
              <Ionicons
                name={wh.isClosed ? 'close-circle' : 'checkmark-circle-outline'}
                size={22}
                color={wh.isClosed ? COLORS.error : COLORS.success}
              />
            </TouchableOpacity>
          </View>
        ))}

        <Button
          title={uploadingImages ? 'Uploading photos...' : 'Register Shop'}
          onPress={handleRegisterShop}
          loading={registering}
        />
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shop Settings</Text>
        <TouchableOpacity onPress={() => Alert.alert('Logout', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: logout }
        ])}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Shop Status Toggle */}
      <TouchableOpacity
        style={[styles.statusBar, { borderColor: shop?.acceptingBookings ? COLORS.success : COLORS.error }]}
        onPress={toggleAccepting}
      >
        <View style={styles.iconTextRow}>
          <Ionicons
            name={shop?.acceptingBookings ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={shop?.acceptingBookings ? COLORS.success : COLORS.error}
          />
          <Text style={styles.statusBarText}>
            {shop?.acceptingBookings ? 'Accepting Bookings' : 'Not Accepting Bookings'}
          </Text>
        </View>
        <Text style={[styles.statusToggleText, { color: shop?.acceptingBookings ? COLORS.error : COLORS.success }]}>
          {shop?.acceptingBookings ? 'Pause' : 'Resume'}
        </Text>
      </TouchableOpacity>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {['services', 'staff', 'info'].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <View style={styles.iconTextRow}>
              <Ionicons
                name={t === 'services' ? 'cut-outline' : t === 'staff' ? 'people-outline' : 'storefront-outline'}
                size={14}
                color={tab === t ? COLORS.white : COLORS.textSecondary}
              />
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'services' ? 'Services' : t === 'staff' ? 'Staff' : 'Info'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Services Tab */}
        {tab === 'services' && (
          <>
            {services.map(s => (
              <View key={s._id} style={styles.itemCard}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{s.name}</Text>
                  <View style={styles.iconTextRow}>
                    <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
                    <Text style={styles.itemMeta}>{s.durationMin} mins  ·  ₹{s.price}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleEditService(s)} style={styles.editBtn}>
                  <Ionicons name="pencil" size={14} color={COLORS.accent} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemoveService(s._id)} style={styles.removeBtn}>
                  <Ionicons name="close" size={16} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}

            {showServiceForm ? (
              <View style={styles.formCard}>
                <Input label="Service Name"    value={newService.name}        onChangeText={t => setNewService({ ...newService, name: t })}        placeholder="e.g. Haircut" />
                <Input label="Price (₹)"       value={newService.price}       onChangeText={t => setNewService({ ...newService, price: t })}       placeholder="e.g. 150" keyboardType="number-pad" />
                <Input label="Duration (mins)" value={newService.durationMin} onChangeText={t => setNewService({ ...newService, durationMin: t })} placeholder="e.g. 30"  keyboardType="number-pad" />
                <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                  <Button title={editingServiceId ? 'Update' : 'Add'} onPress={handleAddService} loading={addingService} style={{ flex: 1 }} />
                  <Button title="Cancel" onPress={() => { setShowServiceForm(false); setEditingServiceId(null); setNewService({ name: '', price: '', durationMin: '' }); }} variant="outline" style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingServiceId(null); setNewService({ name: '', price: '', durationMin: '' }); setShowServiceForm(true); }}>
                <Text style={styles.addBtnText}>+ Add Service</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Staff Tab */}
        {tab === 'staff' && (
          <>
            {staff.map(s => (
              <View key={s._id} style={styles.itemCard}>
                <View style={styles.staffAvatar}>
                  <Text style={styles.staffAvatarText}>{s.name.charAt(0)}</Text>
                </View>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{s.name}</Text>
                  <Text style={styles.itemMeta}>{s.phone || 'No phone'}</Text>
                </View>
                <TouchableOpacity onPress={() => handleEditStaff(s)} style={styles.editBtn}>
                  <Ionicons name="pencil" size={14} color={COLORS.accent} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemoveStaff(s._id)} style={styles.removeBtn}>
                  <Ionicons name="close" size={16} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}

            {showStaffForm ? (
              <View style={styles.formCard}>
                <Input label="Staff Name"  value={newStaff.name}  onChangeText={t => setNewStaff({ ...newStaff, name: t })}  placeholder="e.g. Rahul" />
                <Input label="Phone"       value={newStaff.phone} onChangeText={t => setNewStaff({ ...newStaff, phone: t })} placeholder="10-digit number" keyboardType="phone-pad" />
                <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                  <Button title={editingStaffId ? 'Update' : 'Add'} onPress={handleAddStaff} loading={addingStaff} style={{ flex: 1 }} />
                  <Button title="Cancel" onPress={() => { setShowStaffForm(false); setEditingStaffId(null); setNewStaff({ name: '', phone: '' }); }} variant="outline" style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingStaffId(null); setNewStaff({ name: '', phone: '' }); setShowStaffForm(true); }}>
                <Text style={styles.addBtnText}>+ Add Staff</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Info Tab */}
        {tab === 'info' && (
          <View style={styles.formCard}>
            <Input label="Shop Name" value={shopInfo.name} onChangeText={t => setShopInfo({ ...shopInfo, name: t })} placeholder="e.g. Harun Barber Shop" />
            <Input label="Phone" value={shopInfo.phone} onChangeText={t => setShopInfo({ ...shopInfo, phone: t })} placeholder="10-digit number" keyboardType="phone-pad" />
            <Input label="Address" value={shopInfo.address} onChangeText={t => setShopInfo({ ...shopInfo, address: t })} placeholder="Shop address" />

            <Text style={[styles.itemMeta, { marginBottom: SPACING.xs, marginTop: 4 }]}>Category</Text>
            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg }}>
              {['men', 'women', 'unisex'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.tabBtn, { borderWidth: 1, borderColor: COLORS.border }, shopInfo.category === cat && styles.tabBtnActive]}
                  onPress={() => setShopInfo({ ...shopInfo, category: cat })}
                >
                  <Text style={[styles.tabText, shopInfo.category === cat && styles.tabTextActive]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button title="Save Changes" onPress={handleSaveShopInfo} loading={savingShopInfo} />
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl + 20, paddingBottom: SPACING.md },
  title:     { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  logoutText:{ color: COLORS.error, fontSize: FONTS.sizes.sm, fontWeight: '600' },

  statusBar:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: SPACING.lg, marginBottom: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1.5 },
  statusBarText:    { color: COLORS.white, fontWeight: '600', fontSize: FONTS.sizes.sm },
  statusToggleText: { fontWeight: '700', fontSize: FONTS.sizes.sm },

  tabRow:        { flexDirection: 'row', marginHorizontal: SPACING.lg, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.md },
  tabBtn:        { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, alignItems: 'center' },
  tabBtnActive:  { backgroundColor: COLORS.accent },
  tabText:       { color: COLORS.textSecondary, fontWeight: '600', fontSize: FONTS.sizes.sm },
  tabTextActive: { color: COLORS.white },

  scroll: { paddingHorizontal: SPACING.lg },

  itemCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  itemLeft:   { flex: 1 },
  itemName:   { color: COLORS.white, fontWeight: '600', fontSize: FONTS.sizes.md },
  itemMeta:   { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
  iconTextRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  removeBtn:  { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.error + '20', alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: COLORS.error, fontWeight: '700' },
  editBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.accent + '20', alignItems: 'center', justifyContent: 'center', marginRight: SPACING.xs },
  editBtnText:{ color: COLORS.accent, fontWeight: '700' },

  staffAvatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  staffAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md },

  whRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  whDay:   { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, width: 36 },
  whInput: { flex: 1, marginBottom: 0 },
  whDash:  { color: COLORS.textMuted },
  whClosedText: { flex: 1, color: COLORS.textMuted, fontSize: FONTS.sizes.sm },

  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  imageThumbWrap: { width: 72, height: 72, borderRadius: RADIUS.md, overflow: 'hidden' },
  imageThumb: { width: '100%', height: '100%' },
  imageRemoveBtn: { position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center' },
  imageAddBtn: { width: 72, height: 72, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.accent, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },

  formCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  addBtn:   { borderWidth: 1.5, borderColor: COLORS.accent, borderStyle: 'dashed', borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.md },
  addBtnText: { color: COLORS.accent, fontWeight: '600', fontSize: FONTS.sizes.md },
});

export default OwnerShopScreen;