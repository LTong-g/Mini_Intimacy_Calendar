/**
 * 极简武器强化日历 - 应用入口注册文件
 * 
 * 该文件负责注册React Native应用的主组件
 * 确保应用在Expo Go和原生构建环境中都能正常运行
 * 
 * @author Lyu Jiongrui
 * @version 1.0.0
 * @date 2025.7.25
 */

import { registerRootComponent } from 'expo';
import App from './App';

/**
 * 注册应用根组件
 * registerRootComponent会调用AppRegistry.registerComponent('main', () => App)
 * 同时确保无论是在Expo Go还是原生构建中，环境都能正确设置
 */
registerRootComponent(App);
