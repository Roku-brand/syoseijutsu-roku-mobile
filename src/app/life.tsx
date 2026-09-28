import { Redirect } from 'expo-router';

export default function LifeScreen() {
  return <Redirect href={{ pathname: '/personas', params: { category: 'life' } }} />;
}
