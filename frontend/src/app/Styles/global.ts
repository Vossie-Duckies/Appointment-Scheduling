import { StyleSheet } from "react-native";

// all the design for the screens
export const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,         
    backgroundColor: '#EEEEF2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  Container2:{flex:1,justifyContent:'center', alignItems:'center',
     padding: 24, backgroundColor: '#fff'},

   card:{
        alignItems: 'center',
        flexDirection:'row',
        backgroundColor: 'white',
        borderRadius: 10,
        borderWidth: 2,
        borderColor:'transparent',
        padding : 12

    },

    cardSelected:{
    borderColor:'#ff0000'

    },
    avatar: {width: 44,
         height: 44, 
         borderRadius: 22,
          marginRight:12},
    textBlock: {flex :1},
    name:{fontSize: 16, fontWeight:'600'},
    date:{fontSize: 12, color: '#666'},


     container: { flex: 1, 
    padding: 20,
    paddingTop: 70, 
    backgroundColor: '#fff' },

  heading: { fontSize: 18, 
    fontWeight: 'bold',
     textAlign: 'center', 
     marginBottom: 20 },

label:{
    fontSize: 15,
    marginBottom: 16,
    color: '#696969',
    marginTop:9,
},

  button: { backgroundColor: 
    '#ff0000', 
    borderRadius: 6, 
    padding: 14, 
    alignItems: 'center',
     marginBottom: 24 },
  buttonFaded: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: 'bold' },


patient:{textAlign: 'center',
    color:'#696969',
    marginBottom: 17
},

slots:{flexDirection:'row', gap: 8 , flexWrap: 'wrap'},
Slot: {backgroundColor: '#EEEEF2', paddingVertical:10, paddingHorizontal: 14,
    borderRadius: 6

},

Mess:{
    fontSize: 18, fontWeight: '700', marginTop:16
},

SlotSelected: {backgroundColor: '#ff0000' },
SlotText: { color: '#222'

},
TextSelectedSlot:{color: '#fff', fontWeight:'700'},

disabledButton: {opacity: 0.4},

input:{
  borderWidth: 1,
  padding: 12,
  fontSize: 16,
  marginBottom: 12,
  borderColor: '#ccc'

}

})