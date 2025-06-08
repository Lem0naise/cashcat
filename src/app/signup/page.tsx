import { Suspense } from 'react';
import LoadingScreen from '../components/loading';
import SignUpClient from '../components/signUpClient';

export default function Login() {
    return (
        <Suspense fallback={<LoadingScreen/>}>
            <SignUpClient/>
        </Suspense>
    )
}