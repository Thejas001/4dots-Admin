/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "(pages-dir-node)/./src/contexts/AuthContext.tsx":
/*!**************************************!*\
  !*** ./src/contexts/AuthContext.tsx ***!
  \**************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   AuthProvider: () => (/* binding */ AuthProvider),\n/* harmony export */   useAuth: () => (/* binding */ useAuth)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/router */ \"(pages-dir-node)/./node_modules/next/router.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! axios */ \"axios\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([axios__WEBPACK_IMPORTED_MODULE_3__]);\naxios__WEBPACK_IMPORTED_MODULE_3__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\n\nconst AuthContext = /*#__PURE__*/ (0,react__WEBPACK_IMPORTED_MODULE_1__.createContext)(undefined);\nconst AuthProvider = ({ children })=>{\n    const router = (0,next_router__WEBPACK_IMPORTED_MODULE_2__.useRouter)();\n    const [authState, setAuthState] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)({\n        isAuthenticated: false,\n        token: null,\n        phoneNumber: null\n    });\n    const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(true);\n    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)({\n        \"AuthProvider.useEffect\": ()=>{\n            // Check for token in localStorage on mount\n            const token = localStorage.getItem('auth_token');\n            const phoneNumber = localStorage.getItem('phone_number');\n            console.log('AuthContext - Initial token:', token);\n            console.log('AuthContext - Initial phoneNumber:', phoneNumber);\n            if (token) {\n                setAuthState({\n                    isAuthenticated: true,\n                    token,\n                    phoneNumber\n                });\n                // Configure axios defaults for future requests\n                axios__WEBPACK_IMPORTED_MODULE_3__[\"default\"].defaults.headers.common['Authorization'] = `Bearer ${token}`;\n            }\n            setLoading(false);\n        }\n    }[\"AuthProvider.useEffect\"], []);\n    const sendOTP = async (phoneNumber)=>{\n        try {\n            const requestData = {\n                PhoneNumber: phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`\n            };\n            console.log('Sending OTP request:', requestData);\n            const response = await axios__WEBPACK_IMPORTED_MODULE_3__[\"default\"].post('https://fourdotsapp.azurewebsites.net/api/account/register-or-login', requestData);\n            setAuthState((prev)=>({\n                    ...prev,\n                    phoneNumber\n                }));\n            localStorage.setItem('phone_number', phoneNumber);\n        } catch (error) {\n            console.error('Error sending OTP:', error);\n            if (error && typeof error === 'object' && 'response' in error) {\n                const axiosError = error;\n                throw new Error(axiosError.response?.data?.message || 'Failed to send OTP');\n            }\n            throw error;\n        }\n    };\n    const verifyOTP = async (phoneNumber, otp)=>{\n        try {\n            const requestData = {\n                PhoneNumber: phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`,\n                Otp: otp\n            };\n            console.log('Verifying OTP request:', requestData);\n            const response = await axios__WEBPACK_IMPORTED_MODULE_3__[\"default\"].post('https://fourdotsapp.azurewebsites.net/api/account/verify-otp', requestData);\n            console.log('OTP verification response:', response.data);\n            const token = response.data.token;\n            setAuthState({\n                isAuthenticated: true,\n                token,\n                phoneNumber\n            });\n            localStorage.setItem('auth_token', token);\n            localStorage.setItem('phone_number', phoneNumber);\n            // Configure axios defaults for future requests\n            axios__WEBPACK_IMPORTED_MODULE_3__[\"default\"].defaults.headers.common['Authorization'] = `Bearer ${token}`;\n            router.push('/orders');\n        } catch (error) {\n            console.error('Error verifying OTP:', error);\n            if (error && typeof error === 'object' && 'response' in error) {\n                const axiosError = error;\n                throw new Error(axiosError.response?.data?.message || 'Failed to verify OTP');\n            }\n            throw error;\n        }\n    };\n    const logout = ()=>{\n        console.log('Logging out...');\n        setAuthState({\n            isAuthenticated: false,\n            token: null,\n            phoneNumber: null\n        });\n        localStorage.removeItem('auth_token');\n        localStorage.removeItem('phone_number');\n        delete axios__WEBPACK_IMPORTED_MODULE_3__[\"default\"].defaults.headers.common['Authorization'];\n        router.push('/login');\n    };\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(AuthContext.Provider, {\n        value: {\n            ...authState,\n            sendOTP,\n            verifyOTP,\n            logout,\n            loading\n        },\n        children: children\n    }, void 0, false, {\n        fileName: \"E:\\\\printdot-admin\\\\src\\\\contexts\\\\AuthContext.tsx\",\n        lineNumber: 123,\n        columnNumber: 5\n    }, undefined);\n};\nconst useAuth = ()=>{\n    const context = (0,react__WEBPACK_IMPORTED_MODULE_1__.useContext)(AuthContext);\n    if (context === undefined) {\n        throw new Error('useAuth must be used within an AuthProvider');\n    }\n    return context;\n};\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9jb250ZXh0cy9BdXRoQ29udGV4dC50c3giLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUE4RTtBQUN0QztBQUNkO0FBYzFCLE1BQU1PLDRCQUFjTixvREFBYUEsQ0FBOEJPO0FBRXhELE1BQU1DLGVBQXdELENBQUMsRUFBRUMsUUFBUSxFQUFFO0lBQ2hGLE1BQU1DLFNBQVNOLHNEQUFTQTtJQUN4QixNQUFNLENBQUNPLFdBQVdDLGFBQWEsR0FBR1YsK0NBQVFBLENBQVk7UUFDcERXLGlCQUFpQjtRQUNqQkMsT0FBTztRQUNQQyxhQUFhO0lBQ2Y7SUFDQSxNQUFNLENBQUNDLFNBQVNDLFdBQVcsR0FBR2YsK0NBQVFBLENBQUM7SUFFdkNDLGdEQUFTQTtrQ0FBQztZQUNSLDJDQUEyQztZQUMzQyxNQUFNVyxRQUFRSSxhQUFhQyxPQUFPLENBQUM7WUFDbkMsTUFBTUosY0FBY0csYUFBYUMsT0FBTyxDQUFDO1lBRXpDQyxRQUFRQyxHQUFHLENBQUMsZ0NBQWdDUDtZQUM1Q00sUUFBUUMsR0FBRyxDQUFDLHNDQUFzQ047WUFFbEQsSUFBSUQsT0FBTztnQkFDVEYsYUFBYTtvQkFDWEMsaUJBQWlCO29CQUNqQkM7b0JBQ0FDO2dCQUNGO2dCQUNBLCtDQUErQztnQkFDL0NWLHNEQUFjLENBQUNrQixPQUFPLENBQUNDLE1BQU0sQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLE9BQU8sRUFBRVYsT0FBTztZQUNwRTtZQUNBRyxXQUFXO1FBQ2I7aUNBQUcsRUFBRTtJQUVMLE1BQU1RLFVBQVUsT0FBT1Y7UUFDckIsSUFBSTtZQUNGLE1BQU1XLGNBQW9DO2dCQUN4Q0MsYUFBYVosWUFBWWEsVUFBVSxDQUFDLFNBQVNiLGNBQWMsQ0FBQyxHQUFHLEVBQUVBLGFBQWE7WUFDaEY7WUFFQUssUUFBUUMsR0FBRyxDQUFDLHdCQUF3Qks7WUFDcEMsTUFBTUcsV0FBVyxNQUFNeEIsa0RBQVUsQ0FBQyx1RUFBdUVxQjtZQUV6R2QsYUFBYW1CLENBQUFBLE9BQVM7b0JBQUUsR0FBR0EsSUFBSTtvQkFBRWhCO2dCQUFZO1lBQzdDRyxhQUFhYyxPQUFPLENBQUMsZ0JBQWdCakI7UUFDdkMsRUFBRSxPQUFPa0IsT0FBZ0I7WUFDdkJiLFFBQVFhLEtBQUssQ0FBQyxzQkFBc0JBO1lBQ3BDLElBQUlBLFNBQVMsT0FBT0EsVUFBVSxZQUFZLGNBQWNBLE9BQU87Z0JBQzdELE1BQU1DLGFBQWFEO2dCQUNuQixNQUFNLElBQUlFLE1BQU1ELFdBQVdMLFFBQVEsRUFBRU8sTUFBTUMsV0FBVztZQUN4RDtZQUNBLE1BQU1KO1FBQ1I7SUFDRjtJQUVBLE1BQU1LLFlBQVksT0FBT3ZCLGFBQXFCd0I7UUFDNUMsSUFBSTtZQUNGLE1BQU1iLGNBQWdDO2dCQUNwQ0MsYUFBYVosWUFBWWEsVUFBVSxDQUFDLFNBQVNiLGNBQWMsQ0FBQyxHQUFHLEVBQUVBLGFBQWE7Z0JBQzlFeUIsS0FBS0Q7WUFDUDtZQUVBbkIsUUFBUUMsR0FBRyxDQUFDLDBCQUEwQks7WUFDdEMsTUFBTUcsV0FBVyxNQUFNeEIsa0RBQVUsQ0FDL0IsZ0VBQ0FxQjtZQUdGTixRQUFRQyxHQUFHLENBQUMsOEJBQThCUSxTQUFTTyxJQUFJO1lBQ3ZELE1BQU10QixRQUFRZSxTQUFTTyxJQUFJLENBQUN0QixLQUFLO1lBQ2pDRixhQUFhO2dCQUNYQyxpQkFBaUI7Z0JBQ2pCQztnQkFDQUM7WUFDRjtZQUVBRyxhQUFhYyxPQUFPLENBQUMsY0FBY2xCO1lBQ25DSSxhQUFhYyxPQUFPLENBQUMsZ0JBQWdCakI7WUFFckMsK0NBQStDO1lBQy9DVixzREFBYyxDQUFDa0IsT0FBTyxDQUFDQyxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxPQUFPLEVBQUVWLE9BQU87WUFFbEVKLE9BQU8rQixJQUFJLENBQUM7UUFDZCxFQUFFLE9BQU9SLE9BQWdCO1lBQ3ZCYixRQUFRYSxLQUFLLENBQUMsd0JBQXdCQTtZQUN0QyxJQUFJQSxTQUFTLE9BQU9BLFVBQVUsWUFBWSxjQUFjQSxPQUFPO2dCQUM3RCxNQUFNQyxhQUFhRDtnQkFDbkIsTUFBTSxJQUFJRSxNQUFNRCxXQUFXTCxRQUFRLEVBQUVPLE1BQU1DLFdBQVc7WUFDeEQ7WUFDQSxNQUFNSjtRQUNSO0lBQ0Y7SUFFQSxNQUFNUyxTQUFTO1FBQ2J0QixRQUFRQyxHQUFHLENBQUM7UUFDWlQsYUFBYTtZQUNYQyxpQkFBaUI7WUFDakJDLE9BQU87WUFDUEMsYUFBYTtRQUNmO1FBRUFHLGFBQWF5QixVQUFVLENBQUM7UUFDeEJ6QixhQUFheUIsVUFBVSxDQUFDO1FBQ3hCLE9BQU90QyxzREFBYyxDQUFDa0IsT0FBTyxDQUFDQyxNQUFNLENBQUMsZ0JBQWdCO1FBRXJEZCxPQUFPK0IsSUFBSSxDQUFDO0lBQ2Q7SUFFQSxxQkFDRSw4REFBQ25DLFlBQVlzQyxRQUFRO1FBQ25CQyxPQUFPO1lBQ0wsR0FBR2xDLFNBQVM7WUFDWmM7WUFDQWE7WUFDQUk7WUFDQTFCO1FBQ0Y7a0JBRUNQOzs7Ozs7QUFHUCxFQUFFO0FBRUssTUFBTXFDLFVBQVU7SUFDckIsTUFBTUMsVUFBVTlDLGlEQUFVQSxDQUFDSztJQUMzQixJQUFJeUMsWUFBWXhDLFdBQVc7UUFDekIsTUFBTSxJQUFJNEIsTUFBTTtJQUNsQjtJQUNBLE9BQU9ZO0FBQ1QsRUFBRSIsInNvdXJjZXMiOlsiRTpcXHByaW50ZG90LWFkbWluXFxzcmNcXGNvbnRleHRzXFxBdXRoQ29udGV4dC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0LCB7IGNyZWF0ZUNvbnRleHQsIHVzZUNvbnRleHQsIHVzZVN0YXRlLCB1c2VFZmZlY3QgfSBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCB7IHVzZVJvdXRlciB9IGZyb20gJ25leHQvcm91dGVyJztcclxuaW1wb3J0IGF4aW9zIGZyb20gJ2F4aW9zJztcclxuaW1wb3J0IHsgQXV0aFN0YXRlLCBSZWdpc3RlckxvZ2luUmVxdWVzdCwgVmVyaWZ5T1RQUmVxdWVzdCwgQXV0aFJlc3BvbnNlIH0gZnJvbSAnQC90eXBlcy9hdXRoJztcclxuXHJcbmludGVyZmFjZSBFcnJvclJlc3BvbnNlIHtcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBBdXRoQ29udGV4dFR5cGUgZXh0ZW5kcyBBdXRoU3RhdGUge1xyXG4gIHNlbmRPVFA6IChwaG9uZU51bWJlcjogc3RyaW5nKSA9PiBQcm9taXNlPHZvaWQ+O1xyXG4gIHZlcmlmeU9UUDogKHBob25lTnVtYmVyOiBzdHJpbmcsIG90cDogc3RyaW5nKSA9PiBQcm9taXNlPHZvaWQ+O1xyXG4gIGxvZ291dDogKCkgPT4gdm9pZDtcclxuICBsb2FkaW5nOiBib29sZWFuO1xyXG59XHJcblxyXG5jb25zdCBBdXRoQ29udGV4dCA9IGNyZWF0ZUNvbnRleHQ8QXV0aENvbnRleHRUeXBlIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xyXG5cclxuZXhwb3J0IGNvbnN0IEF1dGhQcm92aWRlcjogUmVhY3QuRkM8eyBjaGlsZHJlbjogUmVhY3QuUmVhY3ROb2RlIH0+ID0gKHsgY2hpbGRyZW4gfSkgPT4ge1xyXG4gIGNvbnN0IHJvdXRlciA9IHVzZVJvdXRlcigpO1xyXG4gIGNvbnN0IFthdXRoU3RhdGUsIHNldEF1dGhTdGF0ZV0gPSB1c2VTdGF0ZTxBdXRoU3RhdGU+KHtcclxuICAgIGlzQXV0aGVudGljYXRlZDogZmFsc2UsXHJcbiAgICB0b2tlbjogbnVsbCxcclxuICAgIHBob25lTnVtYmVyOiBudWxsLFxyXG4gIH0pO1xyXG4gIGNvbnN0IFtsb2FkaW5nLCBzZXRMb2FkaW5nXSA9IHVzZVN0YXRlKHRydWUpO1xyXG5cclxuICB1c2VFZmZlY3QoKCkgPT4ge1xyXG4gICAgLy8gQ2hlY2sgZm9yIHRva2VuIGluIGxvY2FsU3RvcmFnZSBvbiBtb3VudFxyXG4gICAgY29uc3QgdG9rZW4gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnYXV0aF90b2tlbicpO1xyXG4gICAgY29uc3QgcGhvbmVOdW1iZXIgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncGhvbmVfbnVtYmVyJyk7XHJcbiAgICBcclxuICAgIGNvbnNvbGUubG9nKCdBdXRoQ29udGV4dCAtIEluaXRpYWwgdG9rZW46JywgdG9rZW4pO1xyXG4gICAgY29uc29sZS5sb2coJ0F1dGhDb250ZXh0IC0gSW5pdGlhbCBwaG9uZU51bWJlcjonLCBwaG9uZU51bWJlcik7XHJcbiAgICBcclxuICAgIGlmICh0b2tlbikge1xyXG4gICAgICBzZXRBdXRoU3RhdGUoe1xyXG4gICAgICAgIGlzQXV0aGVudGljYXRlZDogdHJ1ZSxcclxuICAgICAgICB0b2tlbixcclxuICAgICAgICBwaG9uZU51bWJlcixcclxuICAgICAgfSk7XHJcbiAgICAgIC8vIENvbmZpZ3VyZSBheGlvcyBkZWZhdWx0cyBmb3IgZnV0dXJlIHJlcXVlc3RzXHJcbiAgICAgIGF4aW9zLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7dG9rZW59YDtcclxuICAgIH1cclxuICAgIHNldExvYWRpbmcoZmFsc2UpO1xyXG4gIH0sIFtdKTtcclxuXHJcbiAgY29uc3Qgc2VuZE9UUCA9IGFzeW5jIChwaG9uZU51bWJlcjogc3RyaW5nKSA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXF1ZXN0RGF0YTogUmVnaXN0ZXJMb2dpblJlcXVlc3QgPSB7XHJcbiAgICAgICAgUGhvbmVOdW1iZXI6IHBob25lTnVtYmVyLnN0YXJ0c1dpdGgoJys5MScpID8gcGhvbmVOdW1iZXIgOiBgKzkxJHtwaG9uZU51bWJlcn1gXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zb2xlLmxvZygnU2VuZGluZyBPVFAgcmVxdWVzdDonLCByZXF1ZXN0RGF0YSk7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYXhpb3MucG9zdCgnaHR0cHM6Ly9mb3VyZG90c2FwcC5henVyZXdlYnNpdGVzLm5ldC9hcGkvYWNjb3VudC9yZWdpc3Rlci1vci1sb2dpbicsIHJlcXVlc3REYXRhKTtcclxuICAgICAgXHJcbiAgICAgIHNldEF1dGhTdGF0ZShwcmV2ID0+ICh7IC4uLnByZXYsIHBob25lTnVtYmVyIH0pKTtcclxuICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3Bob25lX251bWJlcicsIHBob25lTnVtYmVyKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNlbmRpbmcgT1RQOicsIGVycm9yKTtcclxuICAgICAgaWYgKGVycm9yICYmIHR5cGVvZiBlcnJvciA9PT0gJ29iamVjdCcgJiYgJ3Jlc3BvbnNlJyBpbiBlcnJvcikge1xyXG4gICAgICAgIGNvbnN0IGF4aW9zRXJyb3IgPSBlcnJvciBhcyB7IHJlc3BvbnNlPzogeyBkYXRhPzogeyBtZXNzYWdlPzogc3RyaW5nIH0gfSB9O1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihheGlvc0Vycm9yLnJlc3BvbnNlPy5kYXRhPy5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gc2VuZCBPVFAnKTtcclxuICAgICAgfVxyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBjb25zdCB2ZXJpZnlPVFAgPSBhc3luYyAocGhvbmVOdW1iZXI6IHN0cmluZywgb3RwOiBzdHJpbmcpID0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlcXVlc3REYXRhOiBWZXJpZnlPVFBSZXF1ZXN0ID0ge1xyXG4gICAgICAgIFBob25lTnVtYmVyOiBwaG9uZU51bWJlci5zdGFydHNXaXRoKCcrOTEnKSA/IHBob25lTnVtYmVyIDogYCs5MSR7cGhvbmVOdW1iZXJ9YCxcclxuICAgICAgICBPdHA6IG90cFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc29sZS5sb2coJ1ZlcmlmeWluZyBPVFAgcmVxdWVzdDonLCByZXF1ZXN0RGF0YSk7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYXhpb3MucG9zdDxBdXRoUmVzcG9uc2U+KFxyXG4gICAgICAgICdodHRwczovL2ZvdXJkb3RzYXBwLmF6dXJld2Vic2l0ZXMubmV0L2FwaS9hY2NvdW50L3ZlcmlmeS1vdHAnLFxyXG4gICAgICAgIHJlcXVlc3REYXRhXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZygnT1RQIHZlcmlmaWNhdGlvbiByZXNwb25zZTonLCByZXNwb25zZS5kYXRhKTtcclxuICAgICAgY29uc3QgdG9rZW4gPSByZXNwb25zZS5kYXRhLnRva2VuO1xyXG4gICAgICBzZXRBdXRoU3RhdGUoe1xyXG4gICAgICAgIGlzQXV0aGVudGljYXRlZDogdHJ1ZSxcclxuICAgICAgICB0b2tlbixcclxuICAgICAgICBwaG9uZU51bWJlcixcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnYXV0aF90b2tlbicsIHRva2VuKTtcclxuICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3Bob25lX251bWJlcicsIHBob25lTnVtYmVyKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENvbmZpZ3VyZSBheGlvcyBkZWZhdWx0cyBmb3IgZnV0dXJlIHJlcXVlc3RzXHJcbiAgICAgIGF4aW9zLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7dG9rZW59YDtcclxuICAgICAgXHJcbiAgICAgIHJvdXRlci5wdXNoKCcvb3JkZXJzJyk7XHJcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB2ZXJpZnlpbmcgT1RQOicsIGVycm9yKTtcclxuICAgICAgaWYgKGVycm9yICYmIHR5cGVvZiBlcnJvciA9PT0gJ29iamVjdCcgJiYgJ3Jlc3BvbnNlJyBpbiBlcnJvcikge1xyXG4gICAgICAgIGNvbnN0IGF4aW9zRXJyb3IgPSBlcnJvciBhcyB7IHJlc3BvbnNlPzogeyBkYXRhPzogeyBtZXNzYWdlPzogc3RyaW5nIH0gfSB9O1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihheGlvc0Vycm9yLnJlc3BvbnNlPy5kYXRhPy5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gdmVyaWZ5IE9UUCcpO1xyXG4gICAgICB9XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGNvbnN0IGxvZ291dCA9ICgpID0+IHtcclxuICAgIGNvbnNvbGUubG9nKCdMb2dnaW5nIG91dC4uLicpO1xyXG4gICAgc2V0QXV0aFN0YXRlKHtcclxuICAgICAgaXNBdXRoZW50aWNhdGVkOiBmYWxzZSxcclxuICAgICAgdG9rZW46IG51bGwsXHJcbiAgICAgIHBob25lTnVtYmVyOiBudWxsLFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdhdXRoX3Rva2VuJyk7XHJcbiAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgncGhvbmVfbnVtYmVyJyk7XHJcbiAgICBkZWxldGUgYXhpb3MuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ0F1dGhvcml6YXRpb24nXTtcclxuICAgIFxyXG4gICAgcm91dGVyLnB1c2goJy9sb2dpbicpO1xyXG4gIH07XHJcblxyXG4gIHJldHVybiAoXHJcbiAgICA8QXV0aENvbnRleHQuUHJvdmlkZXJcclxuICAgICAgdmFsdWU9e3tcclxuICAgICAgICAuLi5hdXRoU3RhdGUsXHJcbiAgICAgICAgc2VuZE9UUCxcclxuICAgICAgICB2ZXJpZnlPVFAsXHJcbiAgICAgICAgbG9nb3V0LFxyXG4gICAgICAgIGxvYWRpbmcsXHJcbiAgICAgIH19XHJcbiAgICA+XHJcbiAgICAgIHtjaGlsZHJlbn1cclxuICAgIDwvQXV0aENvbnRleHQuUHJvdmlkZXI+XHJcbiAgKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCB1c2VBdXRoID0gKCkgPT4ge1xyXG4gIGNvbnN0IGNvbnRleHQgPSB1c2VDb250ZXh0KEF1dGhDb250ZXh0KTtcclxuICBpZiAoY29udGV4dCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3VzZUF1dGggbXVzdCBiZSB1c2VkIHdpdGhpbiBhbiBBdXRoUHJvdmlkZXInKTtcclxuICB9XHJcbiAgcmV0dXJuIGNvbnRleHQ7XHJcbn07ICJdLCJuYW1lcyI6WyJSZWFjdCIsImNyZWF0ZUNvbnRleHQiLCJ1c2VDb250ZXh0IiwidXNlU3RhdGUiLCJ1c2VFZmZlY3QiLCJ1c2VSb3V0ZXIiLCJheGlvcyIsIkF1dGhDb250ZXh0IiwidW5kZWZpbmVkIiwiQXV0aFByb3ZpZGVyIiwiY2hpbGRyZW4iLCJyb3V0ZXIiLCJhdXRoU3RhdGUiLCJzZXRBdXRoU3RhdGUiLCJpc0F1dGhlbnRpY2F0ZWQiLCJ0b2tlbiIsInBob25lTnVtYmVyIiwibG9hZGluZyIsInNldExvYWRpbmciLCJsb2NhbFN0b3JhZ2UiLCJnZXRJdGVtIiwiY29uc29sZSIsImxvZyIsImRlZmF1bHRzIiwiaGVhZGVycyIsImNvbW1vbiIsInNlbmRPVFAiLCJyZXF1ZXN0RGF0YSIsIlBob25lTnVtYmVyIiwic3RhcnRzV2l0aCIsInJlc3BvbnNlIiwicG9zdCIsInByZXYiLCJzZXRJdGVtIiwiZXJyb3IiLCJheGlvc0Vycm9yIiwiRXJyb3IiLCJkYXRhIiwibWVzc2FnZSIsInZlcmlmeU9UUCIsIm90cCIsIk90cCIsInB1c2giLCJsb2dvdXQiLCJyZW1vdmVJdGVtIiwiUHJvdmlkZXIiLCJ2YWx1ZSIsInVzZUF1dGgiLCJjb250ZXh0Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/contexts/AuthContext.tsx\n");

/***/ }),

/***/ "(pages-dir-node)/./src/pages/_app.tsx":
/*!****************************!*\
  !*** ./src/pages/_app.tsx ***!
  \****************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _contexts_AuthContext__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/contexts/AuthContext */ \"(pages-dir-node)/./src/contexts/AuthContext.tsx\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/styles/globals.css */ \"(pages-dir-node)/./src/styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_2__);\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_contexts_AuthContext__WEBPACK_IMPORTED_MODULE_1__]);\n_contexts_AuthContext__WEBPACK_IMPORTED_MODULE_1__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\nfunction App({ Component, pageProps }) {\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_contexts_AuthContext__WEBPACK_IMPORTED_MODULE_1__.AuthProvider, {\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n            ...pageProps\n        }, void 0, false, {\n            fileName: \"E:\\\\printdot-admin\\\\src\\\\pages\\\\_app.tsx\",\n            lineNumber: 8,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"E:\\\\printdot-admin\\\\src\\\\pages\\\\_app.tsx\",\n        lineNumber: 7,\n        columnNumber: 5\n    }, this);\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9wYWdlcy9fYXBwLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBQ3NEO0FBQ3hCO0FBRWYsU0FBU0MsSUFBSSxFQUFFQyxTQUFTLEVBQUVDLFNBQVMsRUFBWTtJQUM1RCxxQkFDRSw4REFBQ0gsK0RBQVlBO2tCQUNYLDRFQUFDRTtZQUFXLEdBQUdDLFNBQVM7Ozs7Ozs7Ozs7O0FBRzlCIiwic291cmNlcyI6WyJFOlxccHJpbnRkb3QtYWRtaW5cXHNyY1xccGFnZXNcXF9hcHAudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgQXBwUHJvcHMgfSBmcm9tICduZXh0L2FwcCc7XHJcbmltcG9ydCB7IEF1dGhQcm92aWRlciB9IGZyb20gJ0AvY29udGV4dHMvQXV0aENvbnRleHQnO1xyXG5pbXBvcnQgJ0Avc3R5bGVzL2dsb2JhbHMuY3NzJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEFwcCh7IENvbXBvbmVudCwgcGFnZVByb3BzIH06IEFwcFByb3BzKSB7XHJcbiAgcmV0dXJuIChcclxuICAgIDxBdXRoUHJvdmlkZXI+XHJcbiAgICAgIDxDb21wb25lbnQgey4uLnBhZ2VQcm9wc30gLz5cclxuICAgIDwvQXV0aFByb3ZpZGVyPlxyXG4gICk7XHJcbn0gIl0sIm5hbWVzIjpbIkF1dGhQcm92aWRlciIsIkFwcCIsIkNvbXBvbmVudCIsInBhZ2VQcm9wcyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/pages/_app.tsx\n");

/***/ }),

/***/ "(pages-dir-node)/./src/styles/globals.css":
/*!********************************!*\
  !*** ./src/styles/globals.css ***!
  \********************************/
/***/ (() => {



/***/ }),

/***/ "axios":
/*!************************!*\
  !*** external "axios" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = import("axios");;

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "next/dist/compiled/next-server/pages.runtime.dev.js":
/*!**********************************************************************!*\
  !*** external "next/dist/compiled/next-server/pages.runtime.dev.js" ***!
  \**********************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/pages.runtime.dev.js");

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ }),

/***/ "react-dom":
/*!****************************!*\
  !*** external "react-dom" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("react-dom");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-dev-runtime");

/***/ }),

/***/ "react/jsx-runtime":
/*!************************************!*\
  !*** external "react/jsx-runtime" ***!
  \************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-runtime");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@swc"], () => (__webpack_exec__("(pages-dir-node)/./src/pages/_app.tsx")));
module.exports = __webpack_exports__;

})();