import { Suspense } from 'react';
import LoadingScreen from '../components/loading';
import LoginClient from '../components/loginClient';

export default function Login() {
    return (
        <Suspense fallback={<LoadingScreen/>}>
            <LoginClient/>
        </Suspense>
    )
}