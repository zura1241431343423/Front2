import { Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { RegisterComponent } from './register/register.component';
import { ProfileComponent } from './profile/profile.component';
import { ControlPanelComponent } from './control-panel/control-panel.component';
import { ItEquipmentComponent } from './it-equipment/it-equipment.component';
import { AppliancesComponent } from './appliances/appliances.component';
import { ProductProfileComponent } from './product-profile/product-profile.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { MobileDevicesComponent } from './mobile-devices/mobile-devices.component';
import { SearchResultComponent } from './search-result/search-result.component';
import { CartComponent } from './cart/cart.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'admin-panel', component: ControlPanelComponent },
  { path: 'it-equipment', component: ItEquipmentComponent },
  { path: 'appliances', component: AppliancesComponent },
  { path: 'mobile-devices', component: MobileDevicesComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'product/:id', component: ProductProfileComponent }, 
  { path: 'cart', component: CartComponent },
  { path: 'search-result', component: SearchResultComponent },
  
  // Default and fallback
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', redirectTo: '/home' }
];
